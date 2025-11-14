import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

export async function test_api_reporting_overview_retrieval_by_admin(
  connection: api.IConnection,
) {
  const overview: ICommunityPlatformReportStatistics =
    await api.functional.communityPlatform.admin.dashboard.reporting_overview.at(
      connection,
    );
  typia.assert(overview);
}
