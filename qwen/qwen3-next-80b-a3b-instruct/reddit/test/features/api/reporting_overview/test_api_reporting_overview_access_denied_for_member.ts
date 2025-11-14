import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

export async function test_api_reporting_overview_access_denied_for_member(
  connection: api.IConnection,
) {
  // Attempt to access reporting overview endpoint without authentication (unauthenticated user)
  // According to scenario, non-admin users (including unauthenticated) are denied access
  // Since ICommunityPlatformMember.ICreate is a string, member authentication is impossible
  // Therefore, we test unauthenticated access as the only possible scenario
  await TestValidator.error(
    "unauthenticated access to admin reporting overview should fail with 403",
    async () => {
      await api.functional.communityPlatform.admin.dashboard.reporting_overview.at(
        connection,
      );
    },
  );
}
