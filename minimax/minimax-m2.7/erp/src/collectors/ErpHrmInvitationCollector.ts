import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmInvitationCollector {
  export async function collect(props: {
    body: IErpHrmInvitation.ICreate;
    organization: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      email: props.body.email,
      status: "pending",
      token: v4(),
      position: props.body.position ?? null,
      note: props.body.note ?? null,
      accepted_at: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.organization.id } },
      role: props.body.roleId
        ? { connect: { id: props.body.roleId } }
        : undefined,
      department: props.body.departmentId
        ? { connect: { id: props.body.departmentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_invitationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmInvitationCollector {
//         export async function collect(props: {
//           body: IErpHrmInvitation.ICreate;
//           erpHrmOrganizations: IEntity; // from path parameter organizationId
//           
//           
//         }) {
//           return {
//       id: ...,
//       email: ...,
//       status: ...,
//       token: ...,
//       position: ...,
//       note: ...,
//       accepted_at: ...,
//       expires_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       role: ...,
//       department: ...,
//           } satisfies Prisma.erp_hrm_invitationsCreateInput;
//         }
//       }
//--------------------------------------------------------------