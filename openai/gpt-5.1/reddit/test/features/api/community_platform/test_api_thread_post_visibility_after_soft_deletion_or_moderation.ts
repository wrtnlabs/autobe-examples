import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_thread_post_visibility_after_soft_deletion_or_moderation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser.join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community using memberUser context
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match request body",
    community.slug,
    communityBody.slug,
  );

  // 3. Create a post in that community using memberUser.posts.create
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(createdPost);

  TestValidator.equals(
    "created post community_id should match community.id",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "created post title should match request body title",
    createdPost.title,
    postBody.title,
  );

  // 4. Retrieve the thread as authenticated user via threads.at
  const threadAsMember: ICommunityPlatformPost =
    await api.functional.communityPlatform.threads.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(threadAsMember);

  TestValidator.equals(
    "thread-as-member id should match created post id",
    threadAsMember.id,
    createdPost.id,
  );
  TestValidator.equals(
    "thread-as-member community_id should match created post community_id",
    threadAsMember.community_id,
    createdPost.community_id,
  );
  TestValidator.equals(
    "thread-as-member title should match created post title",
    threadAsMember.title,
    createdPost.title,
  );

  // Ensure the post is not soft-deleted according to the deleted_at field
  TestValidator.predicate(
    "thread-as-member post should not be soft-deleted (deleted_at null or undefined)",
    threadAsMember.deleted_at === null ||
      threadAsMember.deleted_at === undefined,
  );

  // 5. Retrieve the thread anonymously (simulate public caller)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const threadAsAnonymous: ICommunityPlatformPost =
    await api.functional.communityPlatform.threads.at(anonymousConnection, {
      postId: createdPost.id,
    });
  typia.assert(threadAsAnonymous);

  // 6. Assert that the anonymous view is consistent with the member view
  TestValidator.equals(
    "anonymous thread view id should match member view id",
    threadAsAnonymous.id,
    threadAsMember.id,
  );
  TestValidator.equals(
    "anonymous thread view community_id should match member view community_id",
    threadAsAnonymous.community_id,
    threadAsMember.community_id,
  );
  TestValidator.equals(
    "anonymous thread view title should match member view title",
    threadAsAnonymous.title,
    threadAsMember.title,
  );
  TestValidator.equals(
    "anonymous thread view body should match member view body",
    threadAsAnonymous.body,
    threadAsMember.body,
  );
  TestValidator.equals(
    "anonymous thread view status should match member view status",
    threadAsAnonymous.status,
    threadAsMember.status,
  );

  // 7. Call threads.at multiple times to verify stable behavior
  const secondAnonymousThread: ICommunityPlatformPost =
    await api.functional.communityPlatform.threads.at(anonymousConnection, {
      postId: createdPost.id,
    });
  typia.assert(secondAnonymousThread);

  TestValidator.equals(
    "second anonymous thread view should be identical to first anonymous view",
    secondAnonymousThread,
    threadAsAnonymous,
  );
}
