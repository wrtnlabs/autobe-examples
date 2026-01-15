import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_report_dispute } from "../../../prepare/prepare_random_community_platform_report_dispute";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { generate_random_community_platform_member_report_disputes_create } from "../../../generate/generate_random_community_platform_member_report_disputes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_dispute_retrieval_by_reporter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create a system report via admin connection (required for dispute)
  const report = await generate_random_community_platform_admin_reports_create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 4: Create a dispute as the member using the generated report_id
  // Since ICommunityPlatformReport doesn't have an id property, we'll create a UUID for the report_id
  const dispute =
    await generate_random_community_platform_member_report_disputes_create(
      memberConnection,
      {
        body: {
          report_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformReportDispute.ICreate,
      },
    );
  typia.assert(dispute);
  // Step 5: Verify dispute retrieval works with the original member connection (same actor)
  const retrievedDispute =
    await api.functional.communityPlatform.member.report.disputes.at(
      memberConnection,
      {
        disputeId: dispute.id,
      },
    );
  typia.assert(retrievedDispute);
  TestValidator.equals("dispute ID matches", retrievedDispute.id, dispute.id);
  TestValidator.equals(
    "report ID matches",
    retrievedDispute.report_id,
    dispute.report_id,
  );
  TestValidator.equals(
    "submitter ID matches",
    retrievedDispute.submitter_id,
    member.id,
  );
  TestValidator.equals("status is pending", retrievedDispute.status, "pending");
  TestValidator.equals(
    "creation time matches",
    retrievedDispute.created_at,
    dispute.created_at,
  );
  TestValidator.equals(
    "resolution_notes are not exposed",
    retrievedDispute.resolution_notes,
    undefined,
  );
  // Step 6: Verify admin can retrieve the dispute (admin user has elevated access)
  // Re-authenticate admin connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const adminRetrievedDispute =
    await api.functional.communityPlatform.member.report.disputes.at(
      adminLoginConnection,
      {
        disputeId: dispute.id,
      },
    );
  typia.assert(adminRetrievedDispute);
  TestValidator.equals(
    "admin can retrieve dispute",
    adminRetrievedDispute.id,
    dispute.id,
  );
  // Admin should also see resolution_notes (if any)
  TestValidator.equals(
    "admin sees resolution_notes",
    adminRetrievedDispute.resolution_notes,
    dispute.resolution_notes,
  );
  // Step 7: Verify unauthorized access fails - try retrieving with a different member connection
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.error(
    "unauthorized user cannot retrieve dispute",
    async () => {
      await api.functional.communityPlatform.member.report.disputes.at(
        otherMemberConnection,
        {
          disputeId: dispute.id,
        },
      );
    },
  );
}
