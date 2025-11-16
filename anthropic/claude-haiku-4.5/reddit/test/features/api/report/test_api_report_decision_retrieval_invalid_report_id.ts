import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_report_decision_retrieval_invalid_report_id(
  connection: api.IConnection,
) {
  // Test error handling when retrieving decision for non-existent report ID
  // Validates that the endpoint returns 404 error when provided with a valid
  // UUID format that does not correspond to any existing report in the system

  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "should return 404 when retrieving decision for non-existent report",
    404,
    async () => {
      await api.functional.communityPlatform.reports.decision.at(connection, {
        reportId: nonExistentReportId,
      });
    },
  );
}
