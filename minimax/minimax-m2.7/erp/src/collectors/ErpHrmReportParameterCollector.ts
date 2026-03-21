import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmReportParameterCollector {
  export async function collect(props: {
    body: IErpHrmReportParameter.ICreate;
    report: IEntity;
  }) {
    return {
      id: v4(),
      start_date: new Date(props.body.start_date),
      end_date: new Date(props.body.end_date),
      employee_id: props.body.employee_id ?? null,
      project_id: props.body.project_id ?? null,
      task_id: props.body.task_id ?? null,
      billable: props.body.billable ?? null,
      group_by: props.body.group_by,
      created_at: new Date(),
      updated_at: new Date(),
      report: { connect: { id: props.report.id } },
    } satisfies Prisma.erp_hrm_report_parametersCreateInput;
  }
}
