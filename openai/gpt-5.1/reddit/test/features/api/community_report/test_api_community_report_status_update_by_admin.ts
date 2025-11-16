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
 * Validate that an admin user can update status/severity of a community report,
 * while immutable associations remain unchanged and member users cannot perform
 * the same administrative update.
 *
 * Business flow:
 *
 * 1. Register a memberUser account and obtain authenticated context.
 * 2. As that memberUser, create a community.
 * 3. As the same memberUser, create a community-level report targeting the
 *    community.
 * 4. Register an adminUser account and obtain authenticated context.
 * 5. As the adminUser, update the community report's status, severity, and
 *    moderator notes.
 * 6. Verify that mutable fields reflect the update while core associations and
 *    created_at remain stable.
 * 7. Switch back to memberUser and assert that a member cannot perform the same
 *    admin-only update.
 */
export async function test_api_community_report_status_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a community report as member user
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const reportBefore: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(reportBefore);

  // 4. Register admin user (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Confirm login flow for admin (actor switching)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Admin updates community report status/severity/notes
  const newStatus = "in_review";
  const newSeverity = "high";
  const newReasonDetail = `${reportBefore.reason_detail ?? ""}\n[moderator-note] escalated for manual review.`;

  const updateBody = {
    status: newStatus,
    severity: newSeverity,
    reason_detail: newReasonDetail,
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  const reportAfter: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.update(
      connection,
      {
        communityReportId: reportBefore.id,
        body: updateBody,
      },
    );
  typia.assert(reportAfter);

  // 7. Validate core invariants and updated fields
  TestValidator.equals(
    "report id should remain unchanged",
    reportAfter.id,
    reportBefore.id,
  );

  TestValidator.equals(
    "community_id should remain unchanged",
    reportAfter.community_id,
    reportBefore.community_id,
  );

  TestValidator.equals(
    "reporter_memberuser_id should remain unchanged",
    reportAfter.reporter_memberuser_id,
    reportBefore.reporter_memberuser_id,
  );

  TestValidator.equals(
    "status should be updated to new value",
    reportAfter.status,
    newStatus,
  );

  TestValidator.equals(
    "severity should be updated to new value",
    reportAfter.severity,
    newSeverity,
  );

  TestValidator.equals(
    "reason_category should remain unchanged when not updated",
    reportAfter.reason_category,
    reportBefore.reason_category,
  );

  TestValidator.equals(
    "reason_detail should reflect moderator note update",
    reportAfter.reason_detail,
    newReasonDetail,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    reportAfter.created_at,
    reportBefore.created_at,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    reportAfter.updated_at,
    reportBefore.updated_at,
  );

  // 8. Switch back to member user and verify unauthorized update fails
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  await TestValidator.error(
    "member user cannot update community report",
    async () => {
      const memberUpdateBody = {
        status: "resolved",
      } satisfies ICommunityPlatformCommunityReport.IUpdate;

      await api.functional.communityPlatform.adminUser.communityReports.update(
        connection,
        {
          communityReportId: reportBefore.id,
          body: memberUpdateBody,
        },
      );
    },
  );
}
