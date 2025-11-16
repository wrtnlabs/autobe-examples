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
 * Validate that community report updates are restricted to adminUser role.
 *
 * This test models a realistic workflow:
 *
 * 1. A memberUser joins and becomes authenticated.
 * 2. The memberUser creates a community.
 * 3. The memberUser files a community-level report against that community.
 * 4. While still authenticated as memberUser, an attempt is made to call the
 *    adminUser-only update endpoint for the community report, which must fail.
 * 5. An adminUser joins (and becomes authenticated).
 * 6. Using the adminUser token, the same community report is updated successfully
 *    via the admin endpoint.
 *
 * Business rules validated:
 *
 * - Role-based access control: memberUser cannot call
 *   /communityPlatform/adminUser/communityReports/{communityReportId}.
 * - Admin-only capability: adminUser can update status/severity on an existing
 *   community report.
 * - Data integrity: immutable keys such as id and community_id remain stable
 *   across the update.
 */
export async function test_api_community_report_update_restricted_to_admin_role(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/signup",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a community
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

  // 3. Member creates a community report against the created community
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const createdReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  // 4. While authenticated as memberUser, attempt adminUser update (must fail)
  const memberUpdateBody = {
    status: "resolved",
    severity: "high",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  await TestValidator.error(
    "memberUser cannot update community report via adminUser endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.update(
        connection,
        {
          communityReportId: createdReport.id,
          body: memberUpdateBody,
        },
      );
    },
  );

  // 5. Register and authenticate an admin user (join returns authorized context)
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

  // 6. As adminUser, successfully update the same community report
  const adminUpdateBody = {
    status: "in_review",
    severity: "medium",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  const updatedReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.update(
      connection,
      {
        communityReportId: createdReport.id,
        body: adminUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 7. Business validations: id and community_id stable, mutable fields updated
  TestValidator.equals(
    "updated report id should match original report id",
    updatedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "community_id should remain unchanged after admin update",
    updatedReport.community_id,
    createdReport.community_id,
  );

  if (adminUpdateBody.status !== undefined) {
    TestValidator.equals(
      "status should be updated by admin",
      updatedReport.status,
      adminUpdateBody.status,
    );
  }

  if (adminUpdateBody.severity !== undefined) {
    TestValidator.equals(
      "severity should be updated by admin",
      updatedReport.severity,
      adminUpdateBody.severity,
    );
  }

  if (adminUpdateBody.reason_category !== undefined) {
    TestValidator.equals(
      "reason_category should be updated by admin when provided",
      updatedReport.reason_category,
      adminUpdateBody.reason_category,
    );
  }

  if (adminUpdateBody.reason_detail !== undefined) {
    TestValidator.equals(
      "reason_detail should be updated by admin when provided",
      updatedReport.reason_detail,
      adminUpdateBody.reason_detail,
    );
  }
}
