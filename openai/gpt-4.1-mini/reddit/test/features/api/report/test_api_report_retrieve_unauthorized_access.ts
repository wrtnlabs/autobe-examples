import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // No authorization is done to simulate unauthorized access
  // Generate a random UUID for a report ID
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch a report without any authorization
  await TestValidator.httpError(
    "unauthorized access to fetch report should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.reports.at(connection, {
        reportId: fakeReportId,
      });
    },
  );
}
