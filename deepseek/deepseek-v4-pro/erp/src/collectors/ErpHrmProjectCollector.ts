import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectCollector {
  export async function collect(props: { body: IErpHrmProject.ICreate }) {
    return {
      id: v4(),
      organization_id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: "active",
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      projectMembers: undefined,
      tasks: undefined,
      timelogs: undefined,
      timers: undefined,
    } satisfies Prisma.erp_hrm_projectsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmProjectCollector {
//         export async function collect(props: {
//           body: IErpHrmProject.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       organization_id: ...,
//       name: ...,
//       description: ...,
//       color_code: ...,
//       status: ...,
//       budget_hours: ...,
//       start_date: ...,
//       end_date: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       projectMembers: ...,
//       tasks: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.erp_hrm_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------