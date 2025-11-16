import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate nested reply comment detail structure including parentComment, post
 * summary and author context.
 *
 * This scenario builds a realistic cross-actor flow:
 *
 * - A platform admin configures a visibility level and a post type.
 * - A member user registers, logs in, creates a community, and then creates a
 *   post.
 * - The same member user posts a top-level comment and then a reply comment under
 *   that post.
 * - The test calls the public GET
 *   /communityPlatform/posts/{postId}/comments/{commentId} endpoint for the
 *   reply comment and verifies that:
 *
 *   - The reply is returned correctly.
 *   - ParentComment is populated and references the top-level comment.
 *   - Post summary and author summary are consistent with the created entities.
 *   - Lifecycle fields like is_edited, created_at, updated_at, and deleted_at
 *       satisfy expectations for freshly created comments.
 */
export async function test_api_comment_detail_nested_reply_structure(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create a visibility level as platform admin
  const visibilityCode = "public_" + RandomGenerator.alphabets(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platform admin
  const postTypeCode = "text_" + RandomGenerator.alphabets(8);
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: "127.0.0.1",
    href: "https://community.app.local/signup",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user login (exercise login path and ensure header switching)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuth);

  TestValidator.equals(
    "member id from join and login should match",
    memberAuthorized.id,
    memberReAuth.id,
  );

  // 6. Create a community as member user
  const communityIdentifier = "comm-" + RandomGenerator.alphabets(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Nested Comment Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 7. Create a post in that community as member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Post for nested comment detail test",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. Create a top-level comment
  const parentCommentBody = {
    body: "This is a top-level comment for nested reply tests.",
    // No parentCommentId to make it top-level
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals(
    "parent comment belongs to the created post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment author is the member user",
    parentComment.author.id,
    memberAuthorized.id,
  );

  // 9. Create a reply comment under the same post, referencing parentCommentId
  const replyCommentBody = {
    body: "This is a nested reply to the top-level comment.",
    parentCommentId: parentComment.id,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const replyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyCommentBody,
      },
    );
  typia.assert(replyComment);

  TestValidator.equals(
    "reply comment belongs to the same post",
    replyComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply comment parentComment summary id should match parent comment id",
    replyComment.parentComment?.id ?? null,
    parentComment.id,
  );

  // 10. Retrieve the reply comment via public GET detail endpoint
  const detailComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: replyComment.id,
    });
  typia.assert(detailComment);

  // Validate identity
  TestValidator.equals(
    "detail comment id equals reply comment id",
    detailComment.id,
    replyComment.id,
  );

  // Validate parentComment structure
  TestValidator.predicate(
    "detail comment parentComment should be non-null",
    detailComment.parentComment !== null,
  );

  if (detailComment.parentComment !== null) {
    TestValidator.equals(
      "detail comment parentComment id equals parent comment id",
      detailComment.parentComment.id,
      parentComment.id,
    );

    // parentComment summary should reference the same post via post_id
    TestValidator.equals(
      "parentComment summary post_id equals post id",
      detailComment.parentComment.post_id,
      post.id,
    );
  }

  // Validate post summary in detail comment
  TestValidator.equals(
    "detail comment post summary id equals post id",
    detailComment.post.id,
    post.id,
  );

  // Validate author consistency
  TestValidator.equals(
    "detail comment author id equals member user id",
    detailComment.author.id,
    memberAuthorized.id,
  );

  // Lifecycle fields expectations
  TestValidator.equals(
    "reply comment is_edited should be false on creation",
    replyComment.is_edited,
    false,
  );
  TestValidator.equals(
    "detail comment is_edited should be false as well",
    detailComment.is_edited,
    false,
  );

  TestValidator.equals(
    "parent comment deleted_at should be null",
    parentComment.deleted_at,
    null,
  );
  TestValidator.equals(
    "reply comment deleted_at should be null",
    replyComment.deleted_at,
    null,
  );
  TestValidator.equals(
    "detail comment deleted_at should be null",
    detailComment.deleted_at,
    null,
  );

  // created_at and updated_at are validated structurally by typia.assert,
  // but we ensure they are present and non-empty for business sanity.
  TestValidator.predicate(
    "detail comment created_at should be a non-empty string",
    typeof detailComment.created_at === "string" &&
      detailComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "detail comment updated_at should be a non-empty string",
    typeof detailComment.updated_at === "string" &&
      detailComment.updated_at.length > 0,
  );
}
