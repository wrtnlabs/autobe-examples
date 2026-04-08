import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmReportCollector {
  export async function collect(props: {
    body: IErpHrmReport.ICreate;
    erpHrmOrganizations: IEntity;
    erpHrmMembers: IEntity;
  }) {
    return {
      id: v4(),
      report_type: props.body.reportType,
      name: props.body.name,
      created_at: new Date(),
      updated_at: new Date(),
      organization: {
        connect: { id: props.erpHrmOrganizations.id },
      },
      generatedByMember: {
        connect: { id: props.erpHrmMembers.id },
      },
      parameter: {
        create: {
          id: v4(),
          start_date: new Date(props.body.startDate),
          end_date: new Date(props.body.endDate),
          group_by: props.body.groupBy ?? "employee",
          billable: props.body.billable,
          employee_id: props.body.employeeId,
          project_id: props.body.projectId,
          task_id: props.body.taskId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    } satisfies Prisma.erp_hrm_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmReportCollector {
//         export async function collect(props: {
//           body: IErpHrmReport.ICreate;
//           erpHrmOrganizations: IEntity; // from authorized actor
// erpHrmMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       report_type: ...,
//       name: ...,
//       created_at: ...,
//       updated_at: ...,
//       organization: ...,
//       generatedByMember: ...,
//       parameter: ...,
//           } satisfies Prisma.erp_hrm_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------