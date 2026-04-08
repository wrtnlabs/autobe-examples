import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmOrganizationCollector {
  export async function collect(props: {
    body: IErpHrmOrganization.ICreate;
    erpHrmMembers: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      logo_uri: props.body.logoUri ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscalStartMonth,
      created_at: new Date(),
      updated_at: new Date(),
      owner: { connect: { id: props.erpHrmMembers.id } },
    } satisfies Prisma.erp_hrm_organizationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmOrganizationCollector {
//         export async function collect(props: {
//           body: IErpHrmOrganization.ICreate;
//           erpHrmMembers: IEntity; // from authorized actor
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
//       owner: ...,
//       activityLogs: ...,
//       reports: ...,
//       employees: ...,
//       roles: ...,
//       departments: ...,
//       projects: ...,
//       invitations: ...,
//           } satisfies Prisma.erp_hrm_organizationsCreateInput;
//         }
//       }
//--------------------------------------------------------------