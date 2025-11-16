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
 * Basic happy-path scenario: member user creates a top-level comment on their
 * own post.
 *
 * Business flow implemented in this E2E test:
 *
 * 1. Register a member user via /auth/memberUser/join (implicitly authenticates
 *    that actor).
 * 2. Register a platform admin via /auth/platformAdmin/join (implicitly
 *    authenticates admin).
 * 3. As platformAdmin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. As platformAdmin, create a post type via
 *    /communityPlatform/platformAdmin/postTypes.
 * 5. Switch back to memberUser by logging in with /auth/memberUser/login (to
 *    ensure member is the active actor).
 * 6. As memberUser, create a community via
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level by its code.
 * 7. As memberUser, create a post in that community via
 *    /communityPlatform/memberUser/posts using the created post type id.
 * 8. As the same memberUser, create a top-level comment under that post via
 *    /communityPlatform/memberUser/posts/{postId}/comments with an
 *    ICommunityPlatformComment.ICreate body that has a non-empty body, no
 *    parentCommentId, and a valid renderingMode ("markdown").
 * 9. Validate that the returned ICommunityPlatformComment:
 *
 *    - Has the expected post.id in its post summary,
 *    - Has author.id equal to the authenticated member user's id,
 *    - Has a non-null id and created_at/updated_at timestamps,
 *    - Has is_edited === false,
 *    - Has deleted_at === null,
 *    - Has body equal to the request payload body,
 *    - And parentComment is null (top-level comment).
 */
export async function test_api_member_user_create_comment_basic(
  connection: api.IConnection,
) {
  // 1. Register a member user (join implicitly authenticates as that memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform admin (join implicitly authenticates as platformAdmin)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminP@ssw0rd!",
    displayName: RandomGenerator.name(2),
    // ICommunityPlatformPlatformadmin.IJoin.ip?: string | undefined;
    // Use a concrete string instead of null to satisfy the type.
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  // 4. As platformAdmin, create a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(4)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Simple text-based post type for comments test",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 5. Switch back to memberUser by logging in
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. As memberUser, create a community using the created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 7. As memberUser, create a post in that community using the created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. As memberUser, create a top-level comment (no parentCommentId) under the post
  const commentBodyText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const commentCreateBody = {
    body: commentBodyText,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 9. Assertions on created comment
  // Validate linkage to post
  TestValidator.equals(
    "comment.post.id should match created post id",
    comment.post.id,
    post.id,
  );

  // Validate author matches logged-in memberUser
  TestValidator.equals(
    "comment.author.id should match authenticated member user id",
    comment.author.id,
    memberLoginAuthorized.id,
  );

  // Validate body text
  TestValidator.equals(
    "comment.body should equal request body",
    comment.body,
    commentBodyText,
  );

  // Validate is_edited flag
  TestValidator.equals(
    "newly created comment should not be marked as edited",
    comment.is_edited,
    false,
  );

  // Validate deleted_at is null (active comment)
  TestValidator.equals(
    "newly created comment should not be soft-deleted",
    comment.deleted_at,
    null,
  );

  // Validate parentComment is null for top-level comment
  TestValidator.equals(
    "top-level comment should have null parentComment",
    comment.parentComment,
    null,
  );

  // Validate comment id and timestamps are present (additional business checks)
  TestValidator.predicate(
    "comment.id should be a non-empty UUID string",
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate(
    "comment.created_at should be a non-empty timestamp string",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment.updated_at should be a non-empty timestamp string",
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
}
