import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingInvitationCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingInvitation.ICreate;
    organization: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      email: props.body.email,
      status: "pending",
      expired_at: null,
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      inviter: { connect: { id: props.member.id } },
      acceptor: undefined,
      role: { connect: { id: props.body.role_id } },
    } satisfies Prisma.hrm_time_tracking_invitationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingInvitationCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingInvitation.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from authorized session
// hrmTimeTrackingMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       email: ...,
//       status: ...,
//       expired_at: ...,
//       accepted_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       inviter: ...,
//       acceptor: ...,
//       role: ...,
//           } satisfies Prisma.hrm_time_tracking_invitationsCreateInput;
//         }
//       }
//--------------------------------------------------------------