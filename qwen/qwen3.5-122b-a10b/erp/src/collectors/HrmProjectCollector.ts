import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmProjectCollector {
  export async function collect(props: {
    body: IHrmProject.ICreate;
    hrmOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: props.body.status,
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmOrganizations.id } },
    } satisfies Prisma.hrm_projectsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmProjectCollector {
//         export async function collect(props: {
//           body: IHrmProject.ICreate;
//           hrmOrganizations: IEntity; // from path parameter organizationId
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
//       start_date: ...,
//       end_date: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       projectMembers: ...,
//       tasks: ...,
//       timelogs: ...,
//       activeTimers: ...,
//           } satisfies Prisma.hrm_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------