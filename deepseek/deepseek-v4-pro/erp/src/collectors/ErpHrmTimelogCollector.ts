import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimelogCollector {
  export async function collect(props: {
    body: IErpHrmTimelog.ICreate;
    erpHrmEmployees: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      date: new Date(props.body.date),
      duration_minutes: props.body.duration_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: {
        connect: { id: props.body.employee_id ?? props.erpHrmEmployees.id },
      },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
      timesheet: undefined,
    } satisfies Prisma.erp_hrm_timelogsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmTimelogCollector {
//         export async function collect(props: {
//           body: IErpHrmTimelog.ICreate;
//           erpHrmEmployees: IEntity; // from authorized actor
// erpHrmMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       date: ...,
//       duration_minutes: ...,
//       description: ...,
//       billable: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//       timesheet: ...,
//           } satisfies Prisma.erp_hrm_timelogsCreateInput;
//         }
//       }
//--------------------------------------------------------------