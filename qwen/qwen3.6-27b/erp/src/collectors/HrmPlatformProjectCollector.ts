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
    return {
      // Scalar fields
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      budget: props.body.budget ?? null,
      status: "active",
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      // HasMany relations - omitted (optional, populated separately)
    } satisfies Prisma.hrm_platform_projectsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformProjectCollector {
//         export async function collect(props: {
//           body: IHrmPlatformProject.ICreate;
//           hrmPlatformOrganizations: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       color_code: ...,
//       budget: ...,
//       status: ...,
//       start_date: ...,
//       end_date: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       memberships: ...,
//       tasks: ...,
//       timelogs: ...,
//       hrmPlatformTimers: ...,
//           } satisfies Prisma.hrm_platform_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------