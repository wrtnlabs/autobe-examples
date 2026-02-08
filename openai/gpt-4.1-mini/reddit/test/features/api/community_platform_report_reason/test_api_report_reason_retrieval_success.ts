import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_reason_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies retrieval of a report reason by its UUID. Expect 200 OK and valid data.
  // We will generate a random UUID for testing.
  const reportReasonId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a connection copy because base connection must not be used directly
  const testConnection: api.IConnection = { host: connection.host };
  // Call the API to retrieve the report reason by the generated UUID
  const reportReason = await api.functional.communityPlatform.reportReasons.at(
    testConnection,
    {
      reportReasonId: reportReasonId,
    },
  );
  // Assert the response type strictly
  typia.assert(reportReason);
}
