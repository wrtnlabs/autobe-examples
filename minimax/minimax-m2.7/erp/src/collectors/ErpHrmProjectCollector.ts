import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectCollector {
  export async function collect(props: {
    body: IErpHrmProject.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color: props.body.color,
      status: props.body.status ?? "active",
      budget_hours: props.body.budgetHours ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relation
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      // HasMany relations - not handled in project create
      projectMemberships: undefined,
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
//           erpHrmOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       color: ...,
//       status: ...,
//       budget_hours: ...,
//       start_date: ...,
//       end_date: ...,
//       created_at: ...,
//       updated_at: ...,
//       organization: ...,
//       projectMemberships: ...,
//       tasks: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.erp_hrm_projectsCreateInput;
//         }
//       }
//--------------------------------------------------------------