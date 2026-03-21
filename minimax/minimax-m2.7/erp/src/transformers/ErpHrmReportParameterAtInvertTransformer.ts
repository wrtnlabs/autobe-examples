import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmReportAtSummaryTransformer } from "./ErpHrmReportAtSummaryTransformer";

export namespace ErpHrmReportParameterAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_report_parametersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        billable: true,
        group_by: true,
        created_at: true,
        updated_at: true,
        report: ErpHrmReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_report_parametersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmReportParameter.IInvert> {
    return {
      id: input.id,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date.toISOString(),
      employee_id: input.employee_id ?? undefined,
      project_id: input.project_id ?? undefined,
      task_id: input.task_id ?? undefined,
      billable: input.billable ?? undefined,
      group_by: input.group_by,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      report: await ErpHrmReportAtSummaryTransformer.transform(input.report),
    };
  }
}
