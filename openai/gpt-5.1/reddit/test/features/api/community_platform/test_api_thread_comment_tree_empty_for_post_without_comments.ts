import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentTree } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentTree";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_thread_comment_tree_empty_for_post_without_comments(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(10),
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

  // 3. Create the target post in that community (this post will have no comments)
  const targetPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const targetPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: targetPostBody,
    });
  typia.assert(targetPost);

  // 4. Create another post in the same community as noise data
  const otherPostBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const otherPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: otherPostBody,
    });
  typia.assert(otherPost);

  // 5. Prepare an anonymous-style connection (no auth headers), without mutating the original
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Call the comment tree endpoint for the target post with no comments
  const targetTree: ICommunityPlatformCommentTree =
    await api.functional.communityPlatform.threads.tree(anonymousConnection, {
      postId: targetPost.id,
    });
  typia.assert(targetTree);

  // Validate that the tree belongs to the target post
  TestValidator.equals(
    "comment tree postId should match target post id",
    targetTree.postId,
    targetPost.id,
  );

  // Validate that there are no comments (children array is empty for the root node)
  TestValidator.equals(
    "comment tree children should be empty for post without comments",
    targetTree.children.length,
    0,
  );

  // 7. Isolation check: calling tree() for another post should also be scoped correctly
  const otherTree: ICommunityPlatformCommentTree =
    await api.functional.communityPlatform.threads.tree(anonymousConnection, {
      postId: otherPost.id,
    });
  typia.assert(otherTree);

  TestValidator.equals(
    "other comment tree postId should match other post id",
    otherTree.postId,
    otherPost.id,
  );

  TestValidator.equals(
    "other post comment tree children should also be empty (no comments created)",
    otherTree.children.length,
    0,
  );
}
