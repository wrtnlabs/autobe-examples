import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingProjectCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingProject.ICreate;
    hrmTimeTrackingOrganizations: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: "active",
      budget_hours: props.body.budget_hours ?? null,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      ended_at: props.body.ended_at ? new Date(props.body.ended_at) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: {
        connect: { id: props.hrmTimeTrackingOrganizations.id },
      },
    } satisfies Prisma.hrm_time_tracking_projectsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingProjectCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingProject.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       color_code: ...,
//       status: ...,
//       budget_hours: ...,
//       started_at: ...,
//       ended_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       projectMembers: ...,
//       tasks: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.hrm_time_tracking_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------