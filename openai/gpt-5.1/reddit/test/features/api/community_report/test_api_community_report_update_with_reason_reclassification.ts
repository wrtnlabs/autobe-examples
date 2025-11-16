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

export async function test_api_community_report_update_with_reason_reclassification(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(8),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create an initial community report against this community
  const initialReasonCategory = "other";
  const initialReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const reportCreateBody = {
    community_id: community.id,
    reason_category: initialReasonCategory,
    reason_detail: initialReasonDetail,
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const originalReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(originalReport);

  // Snapshot original immutable fields and timestamps
  const originalReportId = originalReport.id;
  const originalCommunityId = originalReport.community_id;
  const originalReporterMemberId = originalReport.reporter_memberuser_id;
  const originalStatus = originalReport.status;
  const originalSeverity = originalReport.severity;
  const originalCreatedAt = originalReport.created_at;
  const originalUpdatedAt = originalReport.updated_at;

  // 4. Register an admin user (join also authenticates admin session)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin reclassifies the community report via update endpoint
  const reclassifiedReasonCategory = "policy_violation";
  const reclassifiedReasonDetail = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });
  const newStatus = "in_review";
  const newSeverity = "medium";

  const reportUpdateBody = {
    reason_category: reclassifiedReasonCategory,
    reason_detail: reclassifiedReasonDetail,
    status: newStatus,
    severity: newSeverity,
  } satisfies ICommunityPlatformCommunityReport.IUpdate;

  const updatedReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.update(
      connection,
      {
        communityReportId: originalReportId,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 6. Business validations

  // 6-1. Immutable identifiers must remain unchanged
  TestValidator.equals(
    "report id must remain unchanged after reclassification",
    updatedReport.id,
    originalReportId,
  );
  TestValidator.equals(
    "community id must remain unchanged after reclassification",
    updatedReport.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "reporter_memberuser_id must remain unchanged after reclassification",
    updatedReport.reporter_memberuser_id,
    originalReporterMemberId,
  );

  // 6-2. Reason fields should be updated to new values
  TestValidator.equals(
    "reason_category should be updated to reclassified value",
    updatedReport.reason_category,
    reclassifiedReasonCategory,
  );
  TestValidator.equals(
    "reason_detail should be updated to investigation notes",
    updatedReport.reason_detail,
    reclassifiedReasonDetail,
  );

  // 6-3. Status should reflect the requested status value
  TestValidator.equals(
    "status should reflect new moderation workflow state",
    updatedReport.status,
    newStatus,
  );

  // 6-4. Severity should reflect the updated severity
  TestValidator.equals(
    "severity should reflect updated triage level",
    updatedReport.severity,
    newSeverity,
  );

  // 6-5. created_at should remain unchanged
  TestValidator.equals(
    "created_at timestamp must not change on update",
    updatedReport.created_at,
    originalCreatedAt,
  );

  // 6-6. updated_at should be refreshed
  TestValidator.notEquals(
    "updated_at timestamp should be refreshed on update",
    updatedReport.updated_at,
    originalUpdatedAt,
  );

  // 6-7. Sanity: original status/severity differ from updated when we changed them
  TestValidator.notEquals(
    "status should differ from original when changed",
    updatedReport.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "severity should differ from original when changed",
    updatedReport.severity,
    originalSeverity,
  );
}
