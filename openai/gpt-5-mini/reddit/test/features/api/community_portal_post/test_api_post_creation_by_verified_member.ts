import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_post_creation_by_verified_member(
  connection: api.IConnection,
) {
  // 1) Register a new member (authorUser)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  TestValidator.predicate(
    "author has id",
    author.id !== undefined && author.id !== null && author.id.length > 0,
  );
  TestValidator.predicate(
    "authorization token present",
    author.token?.access !== undefined && author.token?.access !== null,
  );

  // 2) Create a test community
  const communitySlug = RandomGenerator.alphaNumeric(6);
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  TestValidator.predicate(
    "community id exists",
    community.id !== undefined &&
      community.id !== null &&
      community.id.length > 0,
  );
  TestValidator.equals(
    "community slug preserved",
    community.slug,
    communityBody.slug,
  );

  // 3) Subscribe the author to the community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription user matches author",
    subscription.user_id,
    author.id,
  );

  // 4) Create a text post in the community
  const originalTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });

  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: originalTitle,
    body: originalBody,
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Assertions per scenario
  TestValidator.equals(
    "post community matches",
    post.community_id,
    community.id,
  );
  TestValidator.equals("post author matches", post.author_user_id, author.id);
  TestValidator.equals("post type is text", post.post_type, "text");

  // Title/body may be sanitized; ensure returned values contain the input's prefix
  TestValidator.predicate(
    "title preserved or sanitized but contains original prefix",
    typeof post.title === "string" &&
      post.title.indexOf(
        originalTitle.slice(0, Math.min(8, originalTitle.length)),
      ) !== -1,
  );
  TestValidator.predicate(
    "body preserved or sanitized but contains original prefix",
    typeof (post.body ?? "") === "string" &&
      (post.body ?? "").indexOf(
        originalBody.slice(0, Math.min(16, originalBody.length)),
      ) !== -1,
  );

  // Status should be either published or pending
  TestValidator.predicate(
    "status is published or pending",
    post.status === "published" || post.status === "pending",
  );

  // created_at and updated_at should be present
  TestValidator.predicate(
    "created_at present",
    typeof post.created_at === "string" && post.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof post.updated_at === "string" && post.updated_at.length > 0,
  );
}
