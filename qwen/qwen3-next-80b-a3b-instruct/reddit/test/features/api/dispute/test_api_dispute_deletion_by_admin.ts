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
export async function test_api_dispute_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a system report that will be disputed
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_admin_reports_create(
      memberConnection,
      {
        body: {
          event_type: "content_flag",
          severity: "high",
          content_identifier: typia.random<string & tags.Format<"uuid">>(),
          report_description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Step 3: Create a dispute against the report using the same member connection
  // Since ICommunityPlatformReport has no 'id' property, we generate a new UUID for report_id
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const dispute: ICommunityPlatformReportDispute =
    await generate_random_community_platform_member_report_disputes_create(
      memberConnection,
      {
        body: {
          report_id: reportId,
          reason: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformReportDispute.ICreate,
      },
    );
  typia.assert(dispute);
  // Step 4: Authenticate as admin using a new connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 5: Delete the dispute using admin connection and dispute ID
  const deletedDispute: ICommunityPlatformReportDispute =
    await api.functional.communityPlatform.member.report.disputes.erase(
      adminConnection,
      {
        disputeId: dispute.id,
      },
    );
  typia.assert(deletedDispute);
  // Step 6: Validate that the deleted dispute matches the original dispute structure
  TestValidator.equals(
    "deleted dispute ID matches",
    deletedDispute.id,
    dispute.id,
  );
  TestValidator.equals(
    "deleted dispute report_id matches",
    deletedDispute.report_id,
    dispute.report_id,
  );
  TestValidator.equals(
    "deleted dispute submitter_id matches",
    deletedDispute.submitter_id,
    dispute.submitter_id,
  );
  TestValidator.equals(
    "deleted dispute created_at matches",
    deletedDispute.created_at,
    dispute.created_at,
  );
}
