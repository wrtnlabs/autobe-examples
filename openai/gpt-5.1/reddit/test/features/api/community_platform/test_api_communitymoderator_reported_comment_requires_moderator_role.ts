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
 * Ensure that only community moderators can read reported comments via the
 * communityModerator report-comment endpoint.
 *
 * Business goal
 *
 * - Verify that GET
 *   /communityPlatform/communityModerator/reports/{reportId}/comment is
 *   protected by role-based authorization such that only the
 *   `communityModerator` actor can successfully read the reported comment.
 * - Confirm that even when a valid report id exists, other actors (anonymous,
 *   memberUser, platformAdmin) cannot see the reported comment through this
 *   moderator-only view.
 *
 * Scenario
 *
 * 1. Provision required actors
 *
 *    - Register a memberUser (content + reporter actor).
 *    - Register a platformAdmin (configuration actor + negative test subject).
 *    - Register a communityModerator (moderation actor + positive subject).
 * 2. Seed minimal configuration
 *
 *    - As platformAdmin:
 *
 *         - Create a visibility level via POST
 *                   /communityPlatform/platformAdmin/communityVisibilityLevels
 *                   using ICommunityPlatformCommunityVisibilityLevel.ICreate.
 *         - Create a post type via POST /communityPlatform/platformAdmin/postTypes using
 *                   ICommunityPlatformPostType.ICreate.
 * 3. Content and report creation (as memberUser)
 *
 *    - Login as memberUser.
 *    - Create a community using POST /communityPlatform/memberUser/communities with
 *         ICommunityPlatformCommunity.ICreate referencing the created
 *         visibility-level code.
 *    - Create a post in that community with POST /communityPlatform/memberUser/posts
 *         using ICommunityPlatformPost.ICreate, referencing the community id
 *         and post type id.
 *    - Create a comment under that post via POST
 *         /communityPlatform/memberUser/posts/{postId}/comments using
 *         ICommunityPlatformComment.ICreate.
 *    - Create a report row via POST /communityPlatform/memberUser/reports using
 *         ICommunityPlatformReport.ICreate, with:
 *
 *         - Reporter_type like "member" (or another valid string),
 *         - A valid report_reason_category_id (sourced from random or fixture),
 *         - Community_id equal to the created community id
 *         - Description filled with random text.
 *         - Capture the returned ICommunityPlatformReport.id as `reportId`.
 *
 *    Note: We rely on backend business logic to attach this report to the created
 *    comment, so that the communityModerator endpoint can resolve
 *    ICommunityPlatformReportOfComments for this report id.
 * 4. Authorization checks against the moderator-only endpoint Target:
 *    api.functional.communityPlatform.communityModerator.reports.comment.at
 *    (GET /communityPlatform/communityModerator/reports/{reportId}/comment)
 *
 *    4-1) Anonymous access should fail
 *
 *    - Build an "anonymous" connection object by shallow-cloning the incoming
 *         connection and setting headers to an empty object.
 *    - Call the endpoint with this unauthenticated connection and the existing
 *         reportId.
 *    - Wrap the call in `await TestValidator.error("anonymous cannot read reported
 *         comment", async () => { ... })` to assert that some error is thrown
 *         (401-like behavior).
 *
 *    4-2) memberUser token should fail
 *
 *    - Ensure the main connection is authenticated as the memberUser (either via
 *         join or login).
 *    - Using that connection, call the same endpoint with reportId.
 *    - Assert failure via `await TestValidator.error("memberUser cannot read
 *         reported comment", async () => { ... })`.
 *
 *    4-3) platformAdmin token should fail
 *
 *    - Authenticate as platformAdmin on the same connection using the platformAdmin
 *         login endpoint.
 *    - Call the moderator endpoint with the same reportId.
 *    - Assert failure via `await TestValidator.error("platformAdmin cannot read
 *         reported comment", async () => { ... })`.
 *
 *    4-4) communityModerator token should succeed
 *
 *    - Authenticate as communityModerator on the connection via
 *         /auth/communityModerator/login.
 *    - Call the moderator endpoint with reportId.
 *    - Expect success: capture `const reported: ICommunityPlatformReportOfComments =
 *         ...;` and `typia.assert(reported);`.
 *    - Validate business consistency:
 *
 *         - `reported.report_id` equals the created report.id.
 *         - `reported.comment.id` equals the created comment.id.
 *         - `reported.comment.post.id` (or summary) equals the post.id.
 *         - `reported.comment.post.community.id` (or summary) equals the community.id.
 *    - Use TestValidator.equals with descriptive titles for each equality check.
 * 5. No type-error scenarios
 *
 *    - All request bodies must strictly satisfy their DTO types using the
 *         `satisfies` operator (no `as any`, no missing required fields).
 *    - We do not test wrong-type payloads or intentionally invalid DTO structures in
 *         this test.
 */
export async function test_api_communitymoderator_reported_comment_requires_moderator_role(
  connection: api.IConnection,
) {
  // 1. Create base data: memberUser, platformAdmin, communityModerator
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://example.com/register/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: "https://example.com/register/mod",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 2. As platformAdmin, create visibility level and post type
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: "Public Visibility",
    description: "Publicly visible community for testing",
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
    code: `text-${RandomGenerator.alphabets(6)}`,
    name: "Text Post",
    description: "Simple text post type for tests",
  } satisfies ICommunityPlatformPostType.ICreate;
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. As memberUser, create community, post, comment, report
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://example.com/member/login",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: "Test Community for Reported Comment",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Reported comment test post",
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  const commentCreateBody = {
    body: "This is a comment that will be reported by the member user.",
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

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 4-1. Anonymous access: build separate unauthenticated connection
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous cannot read reported comment",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.comment.at(
        anonymousConnection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 4-2. memberUser token should fail
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://example.com/member/login",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  await TestValidator.error(
    "memberUser cannot read reported comment",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.comment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 4-3. platformAdmin token should fail
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  await TestValidator.error(
    "platformAdmin cannot read reported comment",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.comment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // 4-4. communityModerator token should succeed
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoinBody.email,
      password: communityModeratorJoinBody.password,
      ip: null,
      href: "https://example.com/mod/login",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const reported: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.communityModerator.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(reported);

  TestValidator.equals(
    "report id of linkage matches created report id",
    reported.report_id,
    report.id,
  );

  TestValidator.equals(
    "linked comment id matches created comment id",
    reported.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "linked post id on comment summary matches created post id",
    reported.comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "linked community id on post summary matches created community id",
    reported.comment.post.community.id,
    community.id,
  );
}
