import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

export async function test_api_report_submission_without_authentication(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "unauthenticated report submission should return 401 Unauthorized",
    async () => {
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: typia.random<ICommunityPlatformReport.ICreate>(),
      });
    },
  );
}
