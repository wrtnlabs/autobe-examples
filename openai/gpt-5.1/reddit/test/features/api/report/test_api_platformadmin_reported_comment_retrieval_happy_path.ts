import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Happy-path retrieval of a reported comment for platform administrators.
 *
 * Business scenario:
 *
 * - A platformAdmin configures core community metadata (visibility level and post
 *   type).
 * - A memberUser creates a community, writes a post in that community, and
 *   comments on the post.
 * - The same memberUser files a moderation report that (by backend semantics)
 *   targets that comment.
 * - A platformAdmin then retrieves the comment bound to that report using GET
 *   /communityPlatform/platformAdmin/reports/{reportId}/comment.
 *
 * Test steps:
 *
 * 1. Register a new platformAdmin via /auth/platformAdmin/join, capturing their
 *    credentials for later re-login.
 * 2. While authenticated as platformAdmin, create a new community visibility level
 *    via POST /communityPlatform/platformAdmin/communityVisibilityLevels using
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate. Capture the returned
 *    "code".
 * 3. Register a new memberUser via /auth/memberUser/join, capturing login
 *    identifier and password.
 * 4. As the memberUser, create a new community via POST
 *    /communityPlatform/memberUser/communities with
 *    ICommunityPlatformCommunity.ICreate, using the visibilityLevelCode from
 *    step 2.
 * 5. Switch auth back to platformAdmin using /auth/platformAdmin/login and create
 *    a new post type via POST /communityPlatform/platformAdmin/postTypes with
 *    ICommunityPlatformPostType.ICreate.
 * 6. Switch auth again to the memberUser via /auth/memberUser/login and create a
 *    new post in the previously created community via POST
 *    /communityPlatform/memberUser/posts using ICommunityPlatformPost.ICreate
 *    (community_id + post_type_id + basic title/body).
 * 7. As the memberUser, create a comment under that post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments using
 *    ICommunityPlatformComment.ICreate.
 * 8. As the memberUser, create a top-level report via POST
 *    /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate. Because we have no explicit
 *    subtype-binding SDK in this material, we rely on the documented semantics
 *    that this report will be associated with the comment for the purposes of
 *    this test environment. The report will:
 *
 *    - Use reporter_type="member" (or another valid code from master data, provided
 *         by typia.random),
 *    - Reference some valid report_reason_category_id, generated via typia.random,
 *    - Set community_id to the community created in step 4,
 *    - Include a descriptive free-text description.
 * 9. Switch auth back to platformAdmin using /auth/platformAdmin/login.
 * 10. Call GET /communityPlatform/platformAdmin/reports/{reportId}/comment via
 *     api.functional.communityPlatform.platformAdmin.reports.comment.at using
 *     the report id from step 8.
 *
 * Assertions (business-focused; type/format is covered by typia.assert):
 *
 * - The response is a valid ICommunityPlatformReportOfComments instance.
 * - Response.report_id equals the report.id from step 8.
 * - Response.comment.id equals the comment.id from step 7.
 * - Response.comment.post.id equals the post.id from step 6.
 * - Response.comment.post.community.id equals the community.id from step 4.
 * - Response.created_at and response.updated_at are non-empty strings (ISO-8601
 *   format already guaranteed by typia.assert).
 * - All calls succeed without authorization errors when using the correct actor
 *   tokens.
 */
export async function test_api_platformadmin_reported_comment_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and capture credentials for later login
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminUsername: string = RandomGenerator.name(1);
  const platformAdminPassword = "P@ssw0rd!";
  const platformAdminHref = "https://admin.example.com/join" as string &
    tags.Format<"uri">;
  const platformAdminReferrer = "https://admin.example.com/landing" as string &
    tags.Format<"uri">;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminHref,
        referrer: platformAdminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuth);

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match create payload",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user and capture credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.name(1);
  const memberPassword = "M3mberP@ss";
  const memberHref = "https://community.example.com/join" as string &
    tags.Format<"uri">;
  const memberReferrer = "https://community.example.com/landing" as string &
    tags.Format<"uri">;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuth);

  // 4. As memberUser, create a community referencing the visibility level
  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Switch auth back to platformAdmin and create a post type
  const platformAdminLoginHref = "https://admin.example.com/login" as string &
    tags.Format<"uri">;
  const platformAdminLoginReferrer =
    "https://admin.example.com/dashboard" as string & tags.Format<"uri">;

  const platformAdminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: "127.0.0.1",
        href: platformAdminLoginHref,
        referrer: platformAdminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminReAuth);

  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post Type (E2E)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);
  TestValidator.equals(
    "post type code should match create payload",
    postType.code,
    postTypeCode,
  );

  // 6. Switch auth again to the memberUser and create a post in that community
  const memberLoginHref = "https://community.example.com/login" as string &
    tags.Format<"uri">;
  const memberLoginReferrer = "https://community.example.com/home" as string &
    tags.Format<"uri">;

  const memberReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: memberLoginHref,
        referrer: memberLoginReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberReAuth);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post.community.id should match created community id",
    post.community.id,
    community.id,
  );

  // 7. As memberUser, create a comment on that post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
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
  TestValidator.equals(
    "comment.post.id should match created post id",
    comment.post.id,
    post.id,
  );

  // 8. As memberUser, create a top-level report that we assume targets this comment in backend
  const baseReportCreate: ICommunityPlatformReport.ICreate =
    typia.random<ICommunityPlatformReport.ICreate>();

  const reportCreateBody = {
    reporter_type: baseReportCreate.reporter_type,
    report_reason_category_id: baseReportCreate.report_reason_category_id,
    community_id: community.id,
    severity: baseReportCreate.severity ?? null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 9. Switch auth back to platformAdmin
  const platformAdminReLogin2Href =
    "https://admin.example.com/login2" as string & tags.Format<"uri">;
  const platformAdminReLogin2Referrer =
    "https://admin.example.com/reports" as string & tags.Format<"uri">;

  const platformAdminReAuth2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: "127.0.0.1",
        href: platformAdminReLogin2Href,
        referrer: platformAdminReLogin2Referrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminReAuth2);

  // 10. As platformAdmin, retrieve the reported comment via reportId
  const linkage: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.platformAdmin.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(linkage);

  // Business relationship assertions
  TestValidator.equals(
    "linkage.report_id should equal created report id",
    linkage.report_id,
    report.id,
  );

  TestValidator.equals(
    "linkage.comment.id should equal created comment id",
    linkage.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "linkage.comment.post.id should equal created post id",
    linkage.comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "linkage.comment.post.community.id should equal created community id",
    linkage.comment.post.community.id,
    community.id,
  );

  TestValidator.predicate(
    "linkage.created_at should be non-empty string",
    linkage.created_at.length > 0,
  );

  TestValidator.predicate(
    "linkage.updated_at should be non-empty string",
    linkage.updated_at.length > 0,
  );
}
