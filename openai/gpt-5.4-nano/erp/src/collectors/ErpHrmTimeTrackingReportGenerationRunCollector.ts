import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportGenerationRunCollector {
  const serializeParametersSummary = (
    parameters: Record<string, string>,
  ): string => {
    const sortedKeys = Object.keys(parameters).sort();
    const sorted: Record<string, string> = {};
    for (const k of sortedKeys) sorted[k] = parameters[k];
    return JSON.stringify(sorted);
  };
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportGenerationRun.ICreate;
  }) {
    const id = v4();
    const createdAt = new Date();
    return {
      id,
      status: "pending",
      parameters_summary: serializeParametersSummary(props.body.parameters),
      started_at: null,
      finished_at: null,
      error_message: null,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
      reportDefinition: { connect: { id: props.body.reportDefinitionId } },
      reportOutputs: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_report_generation_runsCreateInput;
  }
}
