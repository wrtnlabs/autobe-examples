import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmEmployeeInvitationCollector {
  export async function collect(props: {
    body: IHrmEmployeeInvitation.ICreate;
    organization: IEntity;
    inviter: IEntity;
  }) {
    const id: string = v4();
    const token: string = crypto.randomUUID();
    const now: Date = new Date();
    return {
      id,
      email: props.body.email,
      status: "pending",
      token,
      expires_at: props.body.expires_at ? new Date(props.body.expires_at) : now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      role: { connect: { id: props.body.role_id } },
      inviter: { connect: { id: props.inviter.id } },
      member: undefined,
    } satisfies Prisma.hrm_employee_invitationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmEmployeeInvitationCollector {
//         export async function collect(props: {
//           body: IHrmEmployeeInvitation.ICreate;
//           hrmOrganizations: IEntity; // from authorized actor
// hrmMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       email: ...,
//       status: ...,
//       token: ...,
//       expires_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       role: ...,
//       inviter: ...,
//       member: ...,
//           } satisfies Prisma.hrm_employee_invitationsCreateInput;
//         }
//       }
//--------------------------------------------------------------