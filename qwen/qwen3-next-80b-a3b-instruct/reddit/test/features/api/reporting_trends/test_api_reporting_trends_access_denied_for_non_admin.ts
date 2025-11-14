import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportingTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportingTrends";

export async function test_api_reporting_trends_access_denied_for_non_admin(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "non-admin users should be denied access to reporting trends",
    async () => {
      await api.functional.communityPlatform.admin.statistics.reporting_trends.index(
        connection,
      );
    },
  );
}
