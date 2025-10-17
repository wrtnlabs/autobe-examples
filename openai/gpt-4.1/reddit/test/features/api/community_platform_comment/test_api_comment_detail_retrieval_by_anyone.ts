import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate comment detail retrieval by anyone for published comments.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new member
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Add a comment to the post
 * 5. Retrieve the comment using GET (as the original user and as an
 *    unauthenticated user)
 * 6. Verify correctness of body, author, timestamps (created_at, updated_at), and
 *    nesting level
 * 7. Assert non-public or moderated comment scenarios by updating status if
 *    supported (skipped if not allowed via API)
 */
export async function test_api_comment_detail_retrieval_by_anyone(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // 2. Create a community as the new member (must be authenticated, token stored)
  const communityCreate = {
    name: RandomGenerator.name(1).replace(/\s/g, "_"),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the created community
  const postCreate = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    content_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 4. Add a comment to the post
  const commentCreate = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 5. Retrieve the comment by ID using GET (as original user / authenticated)
  const retrievedAuth: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedAuth);
  TestValidator.equals(
    "retrieved comment matches posted comment (authenticated)",
    retrievedAuth.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment body matches",
    retrievedAuth.body,
    comment.body,
  );
  TestValidator.equals(
    "retrieved comment author matches",
    retrievedAuth.community_platform_member_id,
    comment.community_platform_member_id,
  );
  TestValidator.equals(
    "retrieved comment post matches",
    retrievedAuth.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved comment nesting level correct",
    retrievedAuth.nesting_level,
    1,
  );
  TestValidator.equals(
    "retrieved comment status is published",
    retrievedAuth.status,
    "published",
  );
  TestValidator.predicate(
    "created_at is date-time (authenticated)",
    typeof retrievedAuth.created_at === "string" &&
      retrievedAuth.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time (authenticated)",
    typeof retrievedAuth.updated_at === "string" &&
      retrievedAuth.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for published",
    retrievedAuth.deleted_at,
    null,
  );

  // 6. (Edge) Retrieve comment as unauthenticated user (simulate logged off)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const retrievedUnauth: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(unauthConn, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedUnauth);
  TestValidator.equals(
    "retrieved comment matches posted comment (unauthenticated)",
    retrievedUnauth.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment body matches",
    retrievedUnauth.body,
    comment.body,
  );
  TestValidator.equals(
    "retrieved comment author matches",
    retrievedUnauth.community_platform_member_id,
    comment.community_platform_member_id,
  );
  TestValidator.equals(
    "retrieved comment post matches",
    retrievedUnauth.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved comment nesting level correct (unauthenticated)",
    retrievedUnauth.nesting_level,
    1,
  );
  TestValidator.equals(
    "retrieved comment status is published (unauthenticated)",
    retrievedUnauth.status,
    "published",
  );
  TestValidator.predicate(
    "created_at is date-time (unauthenticated)",
    typeof retrievedUnauth.created_at === "string" &&
      retrievedUnauth.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time (unauthenticated)",
    typeof retrievedUnauth.updated_at === "string" &&
      retrievedUnauth.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for published (unauthenticated)",
    retrievedUnauth.deleted_at,
    null,
  );

  // 7. Non-public / moderated/deleted comment error test (status update not available by API, so we cannot fully check non-public path)
  // Here, we're limited: only published/retrievable comment is possible in this direct flow.
  // (If the API exposes moderation/delete, use it to check error/redacted-case - not exposed here, so skip)
}
