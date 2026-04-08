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
    erpHrmReports: IEntity;
  }) {
    return {
      id: v4(),
      start_date: new Date(props.body.startDate),
      end_date: new Date(props.body.endDate),
      employee_id: props.body.employeeId ?? null,
      project_id: props.body.projectId ?? null,
      task_id: props.body.taskId ?? null,
      billable: props.body.billable ?? null,
      group_by: props.body.groupBy,
      created_at: new Date(),
      updated_at: new Date(),
      report: { connect: { id: props.erpHrmReports.id } },
    } satisfies Prisma.erp_hrm_report_parametersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmReportParameterCollector {
//         export async function collect(props: {
//           body: IErpHrmReportParameter.ICreate;
//           erpHrmReports: IEntity; // from path parameter reportId
//           
//           
//         }) {
//           return {
//       id: ...,
//       start_date: ...,
//       end_date: ...,
//       employee_id: ...,
//       project_id: ...,
//       task_id: ...,
//       billable: ...,
//       group_by: ...,
//       created_at: ...,
//       updated_at: ...,
//       report: ...,
//           } satisfies Prisma.erp_hrm_report_parametersCreateInput;
//         }
//       }
//--------------------------------------------------------------