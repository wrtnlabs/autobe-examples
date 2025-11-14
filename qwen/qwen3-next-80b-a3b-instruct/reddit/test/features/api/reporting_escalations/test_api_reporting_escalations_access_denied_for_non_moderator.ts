import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";
import type { IPageICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportEscalation";

export async function test_api_reporting_escalations_access_denied_for_non_moderator(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "non-moderator should be denied access to reporting escalations",
    async () => {
      await api.functional.communityPlatform.moderator.analytics.reporting_escalations.search(
        connection,
        {
          body: typia.random<string>(),
        },
      );
    },
  );
}
