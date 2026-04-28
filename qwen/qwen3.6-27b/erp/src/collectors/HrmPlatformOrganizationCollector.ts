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
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      logo_uri: props.body.logo_uri ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.hrm_platform_organizationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformOrganizationCollector {
//         export async function collect(props: {
//           body: IHrmPlatformOrganization.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       logo_uri: ...,
//       currency: ...,
//       timezone: ...,
//       fiscal_start_month: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organizationSnapshots: ...,
//       employees: ...,
//       departments: ...,
//       roles: ...,
//       projects: ...,
//       activityLogs: ...,
//           } satisfies Prisma.hrm_platform_organizationsCreateInput;
//         }
//       }
//--------------------------------------------------------------