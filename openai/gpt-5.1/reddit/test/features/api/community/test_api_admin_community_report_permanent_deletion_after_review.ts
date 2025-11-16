import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

/**
 * Validate that an adminUser can permanently delete an existing community-level
 * report after it has been created and (conceptually) reviewed.
 *
 * Business flow:
 *
 * 1. Register a fresh adminUser account via /auth/adminUser/join.
 * 2. Register a fresh memberUser account via /auth/memberUser/join.
 * 3. Authenticate as memberUser (join already logs in) and create a new community
 *    using ICommunityPlatformCommunity.ICreate.
 * 4. Still as memberUser, create a community-level report targeting the created
 *    community using ICommunityPlatformCommunityReport.ICreate.
 * 5. Switch authentication context to the adminUser via /auth/adminUser/login.
 * 6. As adminUser, call DELETE
 *    /communityPlatform/adminUser/communityReports/{communityReportId} through
 *    api.functional.communityPlatform.adminUser.communityReports.erase.
 * 7. Confirm that the delete operation succeeds (no HttpError is thrown) and that
 *    we had a well-formed report prior to deletion.
 *
 * Limitations:
 *
 * - No admin listing/detail APIs are available in the provided SDK, so we cannot
 *   re-fetch the report to assert 404/absence. Successful completion of erase,
 *   against a previously asserted existing report, is treated as the
 *   verification of permanent deletion.
 */
export async function test_api_admin_community_report_permanent_deletion_after_review(
  connection: api.IConnection,
) {
  // --- 1. Register an adminUser (auto-authenticated on success) ---
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Keep admin credentials for later login switch
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  // --- 2. Register a memberUser (auto-authenticated on success) ---
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
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Sanity: member and admin must be distinct accounts
  TestValidator.notEquals(
    "admin and member accounts must be distinct",
    adminAuthorized.id,
    memberAuthorized.id,
  );

  // --- 3. As memberUser, create a new community ---
  const communityCreateBody = {
    slug: `test-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // Basic validation that created community matches input intent
  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityCreateBody.name,
  );

  // --- 4. As memberUser, create a community-level report ---
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "test_moderation_flow",
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityReport>(report);

  // Ensure the report is correctly linked to the community and reporter
  TestValidator.equals(
    "report community_id must match created community.id",
    report.community_id,
    community.id,
  );
  TestValidator.predicate(
    "report id should be a non-empty UUID string",
    () => report.id.length > 0,
  );

  // --- 5. Switch context back to adminUser via login ---
  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  TestValidator.equals(
    "login should return the same admin id as join",
    adminLoginAuthorized.id,
    adminAuthorized.id,
  );

  // --- 6. As adminUser, permanently erase the community report ---
  await api.functional.communityPlatform.adminUser.communityReports.erase(
    connection,
    {
      communityReportId: report.id,
    },
  );

  // --- 7. Business-level assertion: erase succeeded without error ---
  // If we reach here, the deletion call did not throw, which is our
  // definition of success given the available API surface.
  TestValidator.predicate(
    "adminUser successfully executed erase() on an existing report",
    true,
  );
}
