import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_report_dispute_resolution_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCredentials });
  // Step 2: Simulate a pre-existing dispute with pending status
  // Since no creation endpoint exists, we generate a valid dispute with pending status
  const disputeId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const initialResolutionNotes = RandomGenerator.paragraph({ sentences: 3 });
  const mockDisputeForUpdate: ICommunityPlatformReportDispute =
    typia.random<ICommunityPlatformReportDispute>();
  // Override to match the expected pending status and proper structure
  mockDisputeForUpdate.id = disputeId;
  mockDisputeForUpdate.report_id = reportId;
  mockDisputeForUpdate.status = "pending";
  mockDisputeForUpdate.resolution_notes = initialResolutionNotes;
  mockDisputeForUpdate.submitter_id = member.id;
  mockDisputeForUpdate.created_at = new Date().toISOString();
  typia.assert(mockDisputeForUpdate);
  // Step 3: Update the dispute status to under_review with new resolution_notes
  const newResolutionNotes = RandomGenerator.paragraph({ sentences: 7 });
  const updatedDispute: ICommunityPlatformReportDispute =
    await api.functional.communityPlatform.member.report.disputes.update(
      memberConnection,
      {
        disputeId: disputeId,
        body: {
          status: "under_review",
          resolution_notes: newResolutionNotes,
        } satisfies ICommunityPlatformReportDispute.IUpdate,
      },
    );
  typia.assert(updatedDispute);
  // Step 4: Validate the update was successful
  TestValidator.equals(
    "dispute status should be under_review",
    updatedDispute.status,
    "under_review",
  );
  TestValidator.equals(
    "dispute resolution_notes should be updated",
    updatedDispute.resolution_notes,
    newResolutionNotes,
  );
  // Step 5: Verify the updated dispute maintains original report_id and submitter_id
  TestValidator.equals(
    "dispute report_id should remain unchanged",
    updatedDispute.report_id,
    reportId,
  );
  TestValidator.equals(
    "dispute submitter_id should match member id",
    updatedDispute.submitter_id,
    member.id,
  );
  // Verify resolution_notes was properly updated to the new value, not preserved
  TestValidator.notEquals(
    "resolution_notes should have changed",
    updatedDispute.resolution_notes,
    initialResolutionNotes,
  );
}
