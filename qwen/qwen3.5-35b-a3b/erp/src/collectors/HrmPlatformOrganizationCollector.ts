import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformOrganizationCollector {
  export async function collect(props: {
    body: IHrmPlatformOrganization.ICreate;
    hrmPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.hrmPlatformMembers.id } },
    } satisfies Prisma.hrm_platform_organizationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformOrganizationCollector {
//         export async function collect(props: {
//           body: IHrmPlatformOrganization.ICreate;
//           hrmPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       currency: ...,
//       timezone: ...,
//       fiscal_start_month: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       owner: ...,
//       memberSessions: ...,
//       snapshots: ...,
//       files: ...,
//       departments: ...,
//       employees: ...,
//       employeeSnapshots: ...,
//       contracts: ...,
//       roles: ...,
//       permissions: ...,
//       projects: ...,
//       timeTrackingTimezones: ...,
//       timesheetWeeklyStats: ...,
//       activityLogs: ...,
//           } satisfies Prisma.hrm_platform_organizationsCreateInput;
//         }
//       }
//--------------------------------------------------------------