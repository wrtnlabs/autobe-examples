import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSAnalyticsIRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsIRequest";
import type { ICommunityBBSAnalyticsReportCoverage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsReportCoverage";

export async function test_api_analytics_report_coverage_public_access(
  connection: api.IConnection,
) {
  // Call the public analytics endpoint without authentication to retrieve aggregated report coverage metrics
  const reportCoverage: ICommunityBBSAnalyticsReportCoverage =
    await api.functional.communityBBS.analytics.report_coverage.index(
      connection,
      {
        body: "", // ICommunityBBSAnalyticsIRequest is a string type, empty string represents default/no filtering
      },
    );

  // Validate the response structure matches the ICommunityBBSAnalyticsReportCoverage schema
  // typia.assert() provides complete validation of all properties, types, constraints, and structure
  typia.assert(reportCoverage);
}
