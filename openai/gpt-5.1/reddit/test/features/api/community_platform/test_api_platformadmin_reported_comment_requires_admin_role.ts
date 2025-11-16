import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
 * Verify that only platformAdmin can access reported comment details.
 *
 * Business goal
 *
 * - The endpoint GET /communityPlatform/platformAdmin/reports/{reportId}/comment
 *   is designed for privileged moderation actors (platform admins) to inspect
 *   the comment associated with a specific report.
 * - We must ensure that no other actor type (anonymous, memberUser,
 *   communityModerator) can successfully call this endpoint, even if the
 *   reportId is valid.
 *
 * End-to-end flow
 *
 * 1. Create three actors and obtain tokens through the proper auth flows:
 *
 *    - MemberUser (used to create community, post, comment, and the report)
 *    - CommunityModerator (used only for negative authorization testing)
 *    - PlatformAdmin (used for positive authorization testing)
 * 2. As platformAdmin, create minimal configuration master data required for
 *    memberUser content creation:
 *
 *    - A community visibility level via POST
 *         /communityPlatform/platformAdmin/communityVisibilityLevels
 *    - A post type via POST /communityPlatform/platformAdmin/postTypes
 * 3. As memberUser, create real content that can be reported:
 *
 *    - Create a community via POST /communityPlatform/memberUser/communities using
 *         the visibilityLevelCode from step 2.
 *    - Create a post in that community via POST /communityPlatform/memberUser/posts
 *         using the post type from step 2.
 *    - Create a comment on that post via POST
 *         /communityPlatform/memberUser/posts/{postId}/comments.
 * 4. As memberUser, create a top-level report via POST
 *    /communityPlatform/memberUser/reports with a realistic
 *    ICommunityPlatformReport.ICreate payload. The scenario materials do not
 *    expose any dedicated "report-of-comments" creation endpoint, but the SDK
 *    contains a comment-specific view type (ICommunityPlatformReportOfComments)
 *    and a platformAdmin GET endpoint that resolves from a reportId to that
 *    comment linkage.
 *
 *    Because we are not given a specialized SDK function for associating the
 *    report to the comment subtype, we cannot explicitly wire the linkage in
 *    this test. Instead, we focus the test on role-based authorization behavior
 *    of the GET endpoint for a valid reportId, trusting that the backend under
 *    test is responsible for establishing that linkage either as part of the
 *    report creation flow or via other internal processes.
 * 5. Prepare an unauthenticated connection for the anonymous negative case by
 *    cloning the original connection and wiping headers so that no
 *    Authorization token is sent.
 * 6. Perform authorization checks for the GET
 *    /communityPlatform/platformAdmin/reports/{reportId}/comment endpoint in
 *    four contexts:
 *
 *    6-1. Anonymous (no Authorization header): - Use the unauthenticated cloned
 *    connection and call the endpoint with the valid reportId. - Expect an
 *    authentication/authorization failure. - Use TestValidator.error("...",
 *    async () => ...) to assert that an error is thrown, without inspecting
 *    HTTP status codes or error bodies.
 *
 *    6-2. memberUser: - Ensure the connection is authenticated as the memberUser
 *    (by either relying on the join side effect or explicitly logging in). -
 *    Call the endpoint with the same reportId. - Expect authorization failure
 *    (since memberUser should not be able to access platformAdmin report
 *    comment details).
 *
 *    6-3. communityModerator: - Authenticate as communityModerator via login. -
 *    Call the endpoint with the same reportId. - Expect authorization failure
 *    again.
 *
 *    6-4. platformAdmin: - Authenticate (or remain authenticated) as platformAdmin
 *    via login. - Call the endpoint with the same reportId using
 *    api.functional.communityPlatform.platformAdmin.reports.comment.at. -
 *    Expect success and receive a valid ICommunityPlatformReportOfComments
 *    instance. - Validate the response structure with typia.assert(). -
 *    Additionally, assert that the report_id in the payload matches the
 *    report.id created in step 4, and that the embedded comment has a non-empty
 *    body string.
 *
 * Assertions and validation strategy
 *
 * - Do not depend on specific HTTP status codes (401/403); instead assert error
 *   presence using TestValidator.error(...).
 * - Use typia.assert() on all successful responses to guarantee DTO shape.
 * - Use TestValidator.equals() with descriptive titles for all equality
 *   assertions, following the pattern TestValidator.equals("title", actual,
 *   expected).
 * - Focus on business-level authorization correctness:
 *
 *   - Anonymous, memberUser, communityModerator: must fail.
 *   - PlatformAdmin: must succeed for the same reportId and yield a type-safe
 *       ICommunityPlatformReportOfComments payload.
 */
export async function test_api_platformadmin_reported_comment_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Create actors and obtain tokens
  // 1-1. memberUser join (auto-authenticates connection as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 1-2. communityModerator join (this call switches connection auth context)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 1-3. platformAdmin join (this call switches connection auth context)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create visibility level and post type
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(5)}`,
    name: "Public",
    description: "Public visibility for test community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(5)}`,
    name: "Text",
    description: "Text post type for tests",
  } satisfies ICommunityPlatformPostType.ICreate;
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. Switch back to memberUser for content creation
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 3-1. Create community as memberUser
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Community for Reported Comment",
    description: "Community used for role-based reported-comment tests",
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

  // 3-2. Create post inside community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Post for reported comment role test",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 3-3. Create comment on post
  const commentCreateBody = {
    body: "This is a comment that will be reported in the test.",
    parentCommentId: undefined,
    renderingMode: "plainText",
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

  // 4. Create top-level report as memberUser
  const reportCreateBody = {
    reporter_type: "member",
    // We don't have a concrete report reason category fixture; use a random
    // UUID to satisfy the type and rely on backend fixtures/validation
    // appropriate for the test environment.
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: "Reporting this comment for role-based access tests.",
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. Prepare unauthenticated connection for anonymous access test
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6-1. Anonymous access must fail
  await TestValidator.error(
    "anonymous user cannot access platformAdmin reported-comment endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.comment.at(
        anonymousConnection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 6-2. memberUser access must fail (connection currently authenticated as memberUser)
  await TestValidator.error(
    "memberUser cannot access platformAdmin reported-comment endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.comment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 6-3. communityModerator access must fail
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  await TestValidator.error(
    "communityModerator cannot access platformAdmin reported-comment endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.comment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 6-4. platformAdmin access must succeed
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  const reportedComment: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.platformAdmin.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(reportedComment);

  // Business-level assertions on successful payload
  TestValidator.equals(
    "reportedComment.report_id should match created report.id",
    reportedComment.report_id,
    report.id,
  );
  TestValidator.predicate(
    "reported comment body should be non-empty",
    reportedComment.comment.body.length > 0,
  );
}
