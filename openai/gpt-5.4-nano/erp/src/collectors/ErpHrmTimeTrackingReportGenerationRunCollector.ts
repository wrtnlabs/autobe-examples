import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportGenerationRunCollector {
  type StableRecord = Record<string, string>;
  function stableStringify(obj: StableRecord): string {
    const keys = Object.keys(obj).sort();
    const ordered: StableRecord = {};
    for (const k of keys) ordered[k] = obj[k];
    return JSON.stringify(ordered);
  }
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportGenerationRun.ICreate;
  }) {
    return {
      id: v4(),
      status: "pending",
      parameters_summary: stableStringify(props.body.parameters),
      started_at: null,
      finished_at: null,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reportDefinition: { connect: { id: props.body.reportDefinitionId } },
      reportOutputs: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_report_generation_runsCreateInput;
  }
}
