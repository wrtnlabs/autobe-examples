import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformProjectCollector {
  export async function collect(props: {
    body: IHrmPlatformProject.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      color_code: props.body.color_code,
      description: props.body.description ?? null,
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      // HasMany relations (not needed from DTO)
    } satisfies Prisma.hrm_platform_projectsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformProjectCollector {
//         export async function collect(props: {
//           body: IHrmPlatformProject.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       color_code: ...,
//       description: ...,
//       budget_hours: ...,
//       start_date: ...,
//       end_date: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       memberships: ...,
//       tasks: ...,
//       timers: ...,
//       timelogs: ...,
//           } satisfies Prisma.hrm_platform_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------