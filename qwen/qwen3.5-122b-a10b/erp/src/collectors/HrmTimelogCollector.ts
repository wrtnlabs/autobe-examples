import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimelogCollector {
  export async function collect(props: {
    body: IHrmTimelog.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      date: new Date(props.body.date),
      duration_minutes: props.body.duration_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.hrm_project_id } },
      task: props.body.hrm_task_id
        ? { connect: { id: props.body.hrm_task_id } }
        : undefined,
    } satisfies Prisma.hrm_timelogsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimelogCollector {
//         export async function collect(props: {
//           body: IHrmTimelog.ICreate;
//           hrmEmployees: IEntity; // from authorized actor
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
//       timelogTimesheets: ...,
//           } satisfies Prisma.hrm_timelogsCreateInput;
//         }
//       }
//--------------------------------------------------------------