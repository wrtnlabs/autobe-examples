import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate adminUser post report detail exposure for a freshly created report.
 *
 * Business goal: Ensure that when a memberUser files a report against a post,
 * an adminUser can retrieve that report via the admin detail endpoint and see
 * consistent core fields and basic relationships (post summary and reporter
 * summary).
 *
 * Concrete flow implemented with available APIs:
 *
 * 1. Register an adminUser with /auth/adminUser/join.
 * 2. Register a memberUser with /auth/memberUser/join.
 * 3. As memberUser, create a community via
 *    /communityPlatform/memberUser/communities.
 * 4. As the same memberUser, create a post in that community via
 *    /communityPlatform/memberUser/posts.
 * 5. As the same memberUser, create a post report via
 *    /communityPlatform/memberUser/postReports for the created post.
 * 6. Switch authentication to the adminUser via /auth/adminUser/login.
 * 7. As adminUser, call GET
 *    /communityPlatform/adminUser/postReports/{postReportId}.
 * 8. Validate that:
 *
 *    - The report id matches between creation and admin detail.
 *    - Reason_category, severity, and reason_detail are preserved.
 *    - The nested post summary (if present) references the same post id.
 *    - The reporterMember summary (if present) references the same member id.
 *
 * Note: The original high-level scenario mentioned explicit moderation case and
 * assignment linkage, but no APIs are available here to mutate or create
 * moderation cases or assignments. Therefore, this test focuses on verifiable
 * data we can control through the provided endpoints.
 */
export async function test_api_post_report_detail_with_moderation_case_and_assignments(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join implicitly authenticates as this admin).
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Capture admin login credentials for later explicit login step.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  // 2. Register a memberUser.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create a post in that community.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. As memberUser, create a post report for the created post.
  const reportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const createdReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // Sanity checks on created report.
  TestValidator.equals(
    "created report id should be UUID string",
    createdReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "created report reason_category should match input",
    createdReport.reason_category,
    reportCreateBody.reason_category,
  );
  TestValidator.equals(
    "created report severity should match input",
    createdReport.severity,
    reportCreateBody.severity,
  );

  // 6. Switch authentication to adminUser via login endpoint.
  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. As adminUser, retrieve the report detail.
  const detailedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.at(
      connection,
      {
        postReportId: createdReport.id,
      },
    );
  typia.assert(detailedReport);

  // 8. Validate core invariants between created and detailed report.
  TestValidator.equals(
    "report id should match between creation and admin detail",
    detailedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "reason_category should be preserved",
    detailedReport.reason_category,
    createdReport.reason_category,
  );

  TestValidator.equals(
    "severity should be preserved",
    detailedReport.severity,
    createdReport.severity,
  );

  TestValidator.equals(
    "reason_detail should be preserved (including null/undefined)",
    detailedReport.reason_detail ?? null,
    createdReport.reason_detail ?? null,
  );

  // Validate post relationship when present.
  if (detailedReport.post !== undefined) {
    TestValidator.equals(
      "detailed report's post summary id should match original post id",
      detailedReport.post.id,
      post.id,
    );

    TestValidator.predicate(
      "post summary title should be non-empty",
      detailedReport.post.title.length > 0,
    );
  }

  // Validate reporter member relationship when present.
  if (
    detailedReport.reporterMember !== undefined &&
    detailedReport.reporterMember !== null
  ) {
    TestValidator.equals(
      "reporterMember summary id should match member user id",
      detailedReport.reporterMember.id,
      memberAuthorized.id,
    );
  }

  // If moderationCase is present, just ensure it structurally matches the
  // expected summary type via typia.assert, without asserting presence.
  if (
    detailedReport.moderationCase !== undefined &&
    detailedReport.moderationCase !== null
  ) {
    const moderationCase: ICommunityPlatformModerationCase.ISummary =
      detailedReport.moderationCase;
    typia.assert<ICommunityPlatformModerationCase.ISummary>(moderationCase);
  }

  // If assignedAdmin is present, ensure it structurally matches admin summary.
  if (
    detailedReport.assignedAdmin !== undefined &&
    detailedReport.assignedAdmin !== null
  ) {
    const assignedAdmin: ICommunityPlatformAdminuser.ISummary =
      detailedReport.assignedAdmin;
    typia.assert<ICommunityPlatformAdminuser.ISummary>(assignedAdmin);
  }
}
