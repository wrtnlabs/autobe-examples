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
 * Validate nested reply comment creation by a member user.
 *
 * Business flow:
 *
 * 1. Register a member user via /auth/memberUser/join (auto-authenticates
 *    memberUser actor).
 * 2. Register a platform admin via /auth/platformAdmin/join (auto-authenticates
 *    platformAdmin actor).
 * 3. As platformAdmin, create a community visibility level master record.
 * 4. As platformAdmin, create a post type master record.
 * 5. Switch back to memberUser (login) to ensure correct actor.
 * 6. As memberUser, create a community using the created visibility level code.
 * 7. As memberUser, create a post in that community using the created post type
 *    id.
 * 8. As memberUser, create a top-level comment for the post (no parentCommentId).
 * 9. As memberUser, create a nested reply comment for the same post using
 *    parentCommentId set to the top-level comment id and an explicit
 *    renderingMode.
 * 10. Assert response types via typia.assert and validate that:
 *
 *     - The reply’s post.id matches the original post id.
 *     - Reply.parentComment is not null and its id equals the top-level comment id.
 *     - Reply.author.id equals the member user id.
 *     - Reply.is_edited is false on creation.
 *     - Reply.deleted_at is null.
 */
export async function test_api_member_user_create_nested_reply_comment(
  connection: api.IConnection,
) {
  // 1. Register member user (auto-authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register platform admin (auto-authenticates as platformAdmin)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create visibility level master
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. As platformAdmin, create post type master
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 5. Switch back to memberUser via login to ensure actor context
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

  // 6. As memberUser, create a community using visibilityLevelCode
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 7. As memberUser, create a post in that community using the created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. As memberUser, create a top-level comment (no parentCommentId)
  const topCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
    renderingMode: "plainText" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const topComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: topCommentBody,
      },
    );
  typia.assert(topComment);

  // 9. As memberUser, create a nested reply comment with parentCommentId
  const replyCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: topComment.id,
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

  // 10. Business validations for nested reply semantics

  // Post linkage
  TestValidator.equals(
    "reply comment post id must match original post id",
    replyComment.post.id,
    post.id,
  );

  // Parent comment linkage
  TestValidator.predicate(
    "reply comment must have non-null parentComment",
    replyComment.parentComment !== null,
  );

  if (replyComment.parentComment !== null) {
    TestValidator.equals(
      "reply parentComment.id must equal top-level comment id",
      replyComment.parentComment.id,
      topComment.id,
    );
    TestValidator.equals(
      "reply parentComment.post_id must equal parent post id (summary)",
      replyComment.parentComment.post_id,
      post.id,
    );
  }

  // Author linkage
  TestValidator.equals(
    "reply author id must equal member user id",
    replyComment.author.id,
    memberAuthorized.id,
  );

  // is_edited should be false on creation (reply)
  TestValidator.predicate(
    "reply is_edited must be false on initial creation",
    replyComment.is_edited === false,
  );

  // deleted_at should be null on creation
  TestValidator.equals(
    "reply deleted_at must be null on initial creation",
    replyComment.deleted_at,
    null,
  );
}
