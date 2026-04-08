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
    employee: IEntity;
  }) {
    return {
      id: v4(),
      started_at: new Date(),
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.erpHrmProjectId } },
      task: props.body.erpHrmTaskId
        ? { connect: { id: props.body.erpHrmTaskId } }
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
//           erpHrmEmployees: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       started_at: ...,
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