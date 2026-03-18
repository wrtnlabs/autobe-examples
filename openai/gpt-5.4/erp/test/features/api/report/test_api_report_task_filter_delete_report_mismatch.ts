import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_task_filter_delete_report_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const reportConnection: api.IConnection = {
    host: connection.host,
  };
  const reportId = "11111111-1111-1111-1111-111111111111" as string & {
    __format: "uuid";
  };
  const taskFilterId = "22222222-2222-2222-2222-222222222222" as string & {
    __format: "uuid";
  };
  let errored: boolean = false;
  try {
    await api.functional.hrmTimeTracking.reports.taskFilters.erase(
      reportConnection,
      {
        reportId,
        taskFilterId,
      },
    );
  } catch {
    errored = true;
  }
  if (errored === false)
    throw new Error(
      "Deletion must fail when task filter does not belong to the specified report.",
    );
}
