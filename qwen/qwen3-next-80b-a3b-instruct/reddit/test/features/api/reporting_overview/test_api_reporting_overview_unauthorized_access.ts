import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

export async function test_api_reporting_overview_unauthorized_access(
  connection: api.IConnection,
) {
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to reporting overview should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.dashboard.reporting_overview.at(
        unauthConn,
      );
    },
  );
}
