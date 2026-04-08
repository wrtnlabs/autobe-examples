import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmMemberEmailVerificationCollector {
  export async function collect(props: {
    body: IHrmMemberEmailVerification.ICreate;
    hrmMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const expiresAt: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const token: string = v4();
    // Query hrm_members to get the email address
    const member = await MyGlobal.prisma.hrm_members.findFirstOrThrow({
      where: { id: props.hrmMembers.id },
    });
    return {
      id,
      token,
      email: member.email,
      expires_at: expiresAt,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.hrmMembers.id } },
    } satisfies Prisma.hrm_member_email_verificationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmMemberEmailVerificationCollector {
//         export async function collect(props: {
//           body: IHrmMemberEmailVerification.ICreate;
//           hrmMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       email: ...,
//       expires_at: ...,
//       used_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//           } satisfies Prisma.hrm_member_email_verificationsCreateInput;
//         }
//       }
//--------------------------------------------------------------