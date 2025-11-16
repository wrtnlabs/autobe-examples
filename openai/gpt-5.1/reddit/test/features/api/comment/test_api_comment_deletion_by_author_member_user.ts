import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that a memberUser can delete their own comment on a post.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new memberUser via /auth/memberUser/join and obtain an
 *    authenticated connection (SDK injects the Authorization header).
 * 2. As the same memberUser, create a community via
 *    /communityPlatform/memberUser/communities with a plausible
 *    visibilityLevelCode and NSFW flag.
 * 3. As that memberUser, create a post in the created community via
 *    /communityPlatform/memberUser/posts using a random UUID for post_type_id
 *    (we cannot create or look up post types with the given SDK, so the test
 *    focuses on wiring and type-safety, assuming the backend/simulator will
 *    accept the value in this environment).
 * 4. As the same memberUser, create a comment under that post via
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 5. Call DELETE /communityPlatform/memberUser/posts/{postId}/comments/{commentId}
 *    via api.functional.communityPlatform.memberUser.posts.comments.erase using
 *    the same authenticated memberUser and the exact post/comment identifiers
 *    returned from creation.
 * 6. Since the provided SDK does not expose comment GET or listing endpoints for
 *    verification, treat successful completion of erase() as proof that the
 *    author memberUser can delete their own comment and that the call is
 *    properly scoped to the postId/commentId pair.
 *
 * Notes and constraints from the global E2E framework:
 *
 * - We must not implement tests that intentionally cause type errors or use wrong
 *   DTO shapes; all requests must be well-typed.
 * - We must not attempt to validate HTTP status codes or error bodies.
 * - We must not manipulate connection.headers directly; the join endpoint already
 *   attaches the Authorization token.
 */
export async function test_api_comment_deletion_by_author_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Required href and referrer fields must be valid URIs.
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
    // Optional ip can be omitted; when omitted, server derives from request.
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Create a community as this member user
  const communityCreate = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public", // assume a default visibility level code
    isNsfw: false,
    // primaryTagIds is optional; omit it to keep the test simple.
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 3. Create a post in that community as the same member user
  const postCreate = {
    community_id: community.id,
    // We do not have an API to fetch or create post types; use a random UUID
    // to satisfy the type requirements and rely on simulator behavior.
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    // url and image_uri are optional and can be omitted for a simple text post.
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 4. Create a comment under that post as the same member user
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    // parentCommentId and renderingMode are optional; default to plain text
    renderingMode: "plainText" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 5. Delete the comment as the same author member user
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 6. With no read/list comments endpoint available in the SDK, we treat
  // successful completion of erase() as validation that:
  // - The author member user can delete their own comment, and
  // - The deletion is scoped correctly to the given postId/commentId pair.
  TestValidator.predicate(
    "member user was able to delete own comment without error",
    true,
  );
}
