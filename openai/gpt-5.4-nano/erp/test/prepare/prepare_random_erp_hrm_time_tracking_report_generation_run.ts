import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_generation_run(
  input?:
    | DeepPartial<IErpHrmTimeTrackingReportGenerationRun.ICreate>
    | undefined,
): IErpHrmTimeTrackingReportGenerationRun.ICreate {
  const defaultParameters: Record<string, string> = {
    fromDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
    toDate: new Date("2026-03-18T11:41:41.096Z").toISOString(),
    timezone: "Asia/Seoul",
    employeeScope: RandomGenerator.alphaNumeric(10),
  };

  const mergedParameters: Record<string, string | undefined> = input?.parameters
    ? { ...defaultParameters, ...(input.parameters as Record<string, string | undefined>) }
    : defaultParameters;

  const parameters: Record<string, string> = Object.fromEntries(
    Object.entries(mergedParameters).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;

  return {
    reportDefinitionId:
      input?.reportDefinitionId ??
      typia.random<string & tags.Format<"uuid">>(),
    parameters,
  };
}
