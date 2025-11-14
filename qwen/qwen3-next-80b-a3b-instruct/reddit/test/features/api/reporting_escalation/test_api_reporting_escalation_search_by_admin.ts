import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";
import type { IPageICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportEscalation";

export async function test_api_reporting_escalation_search_by_admin(
  connection: api.IConnection,
) {
  // The API only provides one endpoint: search with PATCH /communityPlatform/admin/analytics/reporting-escalations
  // The body parameter is defined as string (ICommunityPlatformReportEscalation.IRequest)
  // The response is defined as string (IPageICommunityPlatformReportEscalation)

  // Test with empty string body
  const emptyBodyResponse: IPageICommunityPlatformReportEscalation =
    await api.functional.communityPlatform.admin.analytics.reporting_escalations.search(
      connection,
      {
        body: "" satisfies ICommunityPlatformReportEscalation.IRequest,
      },
    );
  typia.assert(emptyBodyResponse);
  TestValidator.equals(
    "empty body response should be string",
    typeof emptyBodyResponse,
    "string",
  );

  // Test with numeric string body
  const numericBodyResponse: IPageICommunityPlatformReportEscalation =
    await api.functional.communityPlatform.admin.analytics.reporting_escalations.search(
      connection,
      {
        body: "12345" satisfies ICommunityPlatformReportEscalation.IRequest,
      },
    );
  typia.assert(numericBodyResponse);
  TestValidator.equals(
    "numeric body response should be string",
    typeof numericBodyResponse,
    "string",
  );

  // Test with random string body
  const randomBodyResponse: IPageICommunityPlatformReportEscalation =
    await api.functional.communityPlatform.admin.analytics.reporting_escalations.search(
      connection,
      {
        body: RandomGenerator.alphaNumeric(
          50,
        ) satisfies ICommunityPlatformReportEscalation.IRequest,
      },
    );
  typia.assert(randomBodyResponse);
  TestValidator.equals(
    "random body response should be string",
    typeof randomBodyResponse,
    "string",
  );

  // Validate that responses can be processed as strings
  TestValidator.predicate(
    "non-empty response should contain data",
    randomBodyResponse.length > 0,
  );
}
