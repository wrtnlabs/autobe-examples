import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimerCollector {
  export async function collect(props: {
    body: IErpHrmTimer.ICreate;
    erpHrmEmployees: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      start_timestamp: new Date(),
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.erpHrmEmployees.id } },
      project: { connect: { id: props.body.erp_hrm_project_id } },
      task: props.body.erp_hrm_task_id
        ? { connect: { id: props.body.erp_hrm_task_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_timersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmTimerCollector {
//         export async function collect(props: {
//           body: IErpHrmTimer.ICreate;
//           erpHrmEmployees: IEntity; // from authorized actor
// erpHrmMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       start_timestamp: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//           } satisfies Prisma.erp_hrm_timersCreateInput;
//         }
//       }
//--------------------------------------------------------------