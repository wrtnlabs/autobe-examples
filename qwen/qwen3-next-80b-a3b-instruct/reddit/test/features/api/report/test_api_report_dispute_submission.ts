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
export async function test_api_report_dispute_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin (not strictly needed but follows scenario)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Generate a UUID for report_id (since ICommunityPlatformReport has no id property)
  // We need it to satisfy the dispute creation requirement
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Submit dispute as member with the generated report_id
  const disputeResponse =
    await api.functional.communityPlatform.member.report.disputes.create(
      memberConnection,
      {
        body: {
          report_id: reportId,
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformReportDispute.ICreate,
      },
    );
  // Step 5: Validate the dispute creation and response
  const dispute: ICommunityPlatformReportDispute =
    typia.assert(disputeResponse);
  TestValidator.equals(
    "dispute report_id matches requested ID",
    dispute.report_id,
    reportId,
  );
  TestValidator.equals("dispute status is pending", dispute.status, "pending");
  TestValidator.predicate(
    "dispute has submitter_id",
    Boolean(dispute.submitter_id),
  );
  TestValidator.predicate(
    "dispute has creation timestamp",
    Boolean(dispute.created_at),
  );
  TestValidator.notEquals(
    "dispute resolution_notes is not empty",
    dispute.resolution_notes,
    "",
  );
}
