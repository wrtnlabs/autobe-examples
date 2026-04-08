import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_resolution_escalated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate random resolution data for testing (simulated approach)
  // Note: Actual creation of report/resolution not available in current API
  // Using typia.random to generate escalation-type resolution data
  let resolutionData: IRedditCommunityReportResolution =
    typia.random<IRedditCommunityReportResolution>();
  // Verify the generated data is escalated
  if (resolutionData.resolution_type !== "escalated") {
    // Generate multiple times to find escalated type
    const escalatedResolutions = ArrayUtil.repeat(100, () =>
      typia.random<IRedditCommunityReportResolution>(),
    ).filter((r) => r.resolution_type === "escalated");
    if (escalatedResolutions.length > 0) {
      resolutionData = escalatedResolutions[0];
    } else {
      // Fallback: construct escalated resolution with valid escalation reason
      const randomUUID = typia.random<string & tags.Format<"uuid">>();
      resolutionData = {
        id: randomUUID,
        resolution_type: "escalated",
        status: "escalated",
        escalation_reason: "ambiguity in guidelines; policy precedent required",
        resolution_notes:
          "Content requires senior admin review due to guideline ambiguity",
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        admin: {
          id: typia.random<string & tags.Format<"uuid">>(),
          email: "escalation-test@reddit.com",
          display_name: "Escalation Moderator",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IRedditCommunityAdmin.ISummary,
        report: {
          id: typia.random<string & tags.Format<"uuid">>(),
          reporter: {
            id: typia.random<string & tags.Format<"uuid">>(),
            username: "reporting_user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies IRedditCommunityMember.ISummary,
          community: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: "test_community",
            description: "Test community for escalation",
            subscriber_count: 1000,
            created_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies IRedditCommunityCommunity.ISummary,
          targetPost: null,
          targetComment: null,
          reason: "Policy violation requiring escalation",
          status_id: typia.random<string & tags.Format<"uuid">>(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IRedditCommunityReport.ISummary,
        targetPost: null,
        targetComment: null,
      };
    }
  }
  // 3. Retrieve the resolution via admin endpoint
  const retrievedResolution =
    await api.functional.redditCommunity.admin.report_resolutions.at(
      adminConnection,
      {
        resolutionId: resolutionData.id,
      },
    );
  typia.assert(retrievedResolution);
  // 4. Validate escalation workflow tracking
  TestValidator.equals(
    "resolution type is escalated",
    retrievedResolution.resolution_type,
    "escalated",
  );
  TestValidator.equals(
    "status reflects escalation",
    retrievedResolution.status,
    "escalated",
  );
  TestValidator.equals(
    "resolved_at is null for escalated reports",
    retrievedResolution.resolved_at,
    null,
  );
  TestValidator.equals(
    "admin who escalated is referenced",
    retrievedResolution.admin !== undefined,
    true,
  );
  TestValidator.equals(
    "report context is preserved",
    retrievedResolution.report !== undefined,
    true,
  );
  // 5. Validate escalation notes for audit trail
  if (
    retrievedResolution.resolution_notes !== undefined &&
    retrievedResolution.resolution_notes !== null
  ) {
    TestValidator.predicate(
      "resolution notes are non-empty string",
      retrievedResolution.resolution_notes.length > 0,
    );
  }
  // 6. Validate escalation reason supports tracking
  if (
    retrievedResolution.escalation_reason !== undefined &&
    retrievedResolution.escalation_reason !== null
  ) {
    TestValidator.predicate(
      "escalation reason is meaningful",
      retrievedResolution.escalation_reason.length > 10,
    );
  }
}