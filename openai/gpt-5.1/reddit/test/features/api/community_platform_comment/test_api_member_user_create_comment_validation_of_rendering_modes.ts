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

export async function test_api_member_user_create_comment_validation_of_rendering_modes(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join also authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. (Optional) login as platform admin to exercise login path
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create visibility level and post type as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;

  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public Visible",
    description:
      "Public community visibility for testing comments rendering modes.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;

  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Text-based posts for rendering mode comment tests.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Register member user (join also authenticates)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: undefined,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. (Optional) login as member user to exercise login path and ensure session
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 6. Create community as member user, using the visibility level code
  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Rendering Mode Test Community",
    description:
      "Community used to verify plainText and markdown comment rendering modes.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 7. Create a post in that community as member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Comment Rendering Modes E2E Test",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. Create first comment with renderingMode = plainText
  const plainTextBody = "This is a plain text comment body.";

  const plainTextCommentCreateBody = {
    body: plainTextBody,
    parentCommentId: undefined,
    renderingMode: "plainText",
  } satisfies ICommunityPlatformComment.ICreate;

  const plainTextComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: plainTextCommentCreateBody,
      },
    );
  typia.assert(plainTextComment);

  // Validate first comment
  TestValidator.equals(
    "plainText comment body should match input",
    plainTextComment.body,
    plainTextBody,
  );
  TestValidator.equals(
    "plainText comment post summary id should equal post.id",
    plainTextComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "plainText comment author should equal logged-in member",
    plainTextComment.author.id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "plainText comment parentComment should be null for top-level",
    plainTextComment.parentComment,
    null,
  );
  TestValidator.equals(
    "plainText comment is_edited should be false on creation",
    plainTextComment.is_edited,
    false,
  );

  // 9. Create second comment with renderingMode = markdown
  const markdownBody = "**Bold text** and _italic text_ in markdown comment.";

  const markdownCommentCreateBody = {
    body: markdownBody,
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const markdownComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: markdownCommentCreateBody,
      },
    );
  typia.assert(markdownComment);

  // Validate second comment
  TestValidator.equals(
    "markdown comment body should match input",
    markdownComment.body,
    markdownBody,
  );
  TestValidator.equals(
    "markdown comment post summary id should equal post.id",
    markdownComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "markdown comment author should equal logged-in member",
    markdownComment.author.id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "markdown comment parentComment should be null for top-level",
    markdownComment.parentComment,
    null,
  );
  TestValidator.equals(
    "markdown comment is_edited should be false on creation",
    markdownComment.is_edited,
    false,
  );

  // 10. Cross-validate that the two comment bodies are distinct and both persisted
  TestValidator.notEquals(
    "plainText and markdown comment bodies should differ",
    plainTextComment.body,
    markdownComment.body,
  );
}
