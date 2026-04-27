import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingOrganizationCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingOrganization.ICreate;
    hrmTimeTrackingMembers: IEntity;
    hrmTimeTrackingMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      owner: { connect: { id: props.hrmTimeTrackingMembers.id } },
    } satisfies Prisma.hrm_time_tracking_organizationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingOrganizationCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingOrganization.ICreate;
//           hrmTimeTrackingMembers: IEntity; // from authorized actor
// hrmTimeTrackingMemberSessions: IEntity; // from authorized session
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
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       owner: ...,
//       files: ...,
//       snapshots: ...,
//       departments: ...,
//       departmentSnapshots: ...,
//       roles: ...,
//       employees: ...,
//       projects: ...,
//       invitations: ...,
//       activityLogs: ...,
//           } satisfies Prisma.hrm_time_tracking_organizationsCreateInput;
//         }
//       }
//--------------------------------------------------------------