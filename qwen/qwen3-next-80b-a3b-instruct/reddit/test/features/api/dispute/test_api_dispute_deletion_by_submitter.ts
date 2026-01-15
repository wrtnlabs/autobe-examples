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
export async function test_api_dispute_deletion_by_submitter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Create system report as admin (this will be disputed)
  // Store content_identifier before creating report
  const contentIdentifier = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_admin_reports_create(
      adminConnection,
      {
        body: {
          event_type: "content_flag",
          severity: "medium",
          content_identifier: contentIdentifier, // Use stored identifier
          report_description: "This content violates community guidelines",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Step 3: Create member connection and join member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAccount);
  // Step 4: Member submits dispute against the report
  const dispute: ICommunityPlatformReportDispute =
    await generate_random_community_platform_member_report_disputes_create(
      memberConnection,
      {
        body: {
          report_id: contentIdentifier, // Use stored content_identifier
          reason:
            "I believe this moderation action was unjustified. The content was a legitimate criticism and does not violate any guidelines.",
        } satisfies ICommunityPlatformReportDispute.ICreate,
      },
    );
  typia.assert(dispute);
  // Step 5: Member deletes their own dispute (this should succeed)
  const deletedDispute: ICommunityPlatformReportDispute =
    await api.functional.communityPlatform.member.report.disputes.erase(
      memberConnection,
      {
        disputeId: dispute.id,
      },
    );
  typia.assert(deletedDispute);
  TestValidator.equals(
    "dispute deleted successfully",
    deletedDispute.id,
    dispute.id,
  );
  // Step 6: Verify that other users cannot delete this dispute (re-authenticate as admin and try to delete)
  // Re-authenticate as admin using the original email from join (stored in adminEmail variable)
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminEmail, // Use the stored admin email from join request, not from IAuthorized response
      password: "randomPassword123!", // Any valid password will work to get a session; admin won't be allowed to delete member's dispute
      href: "https://example.com/admin/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Verify admin cannot delete member's dispute
  await TestValidator.error(
    "admin cannot delete member's dispute",
    async () => {
      await api.functional.communityPlatform.member.report.disputes.erase(
        adminConnection2,
        {
          disputeId: dispute.id,
        },
      );
    },
  );
  // Step 7: Verify that original member cannot delete the same dispute twice (it's already deleted)
  await TestValidator.error(
    "member cannot delete already-deleted dispute",
    async () => {
      await api.functional.communityPlatform.member.report.disputes.erase(
        memberConnection,
        {
          disputeId: dispute.id,
        },
      );
    },
  );
}
