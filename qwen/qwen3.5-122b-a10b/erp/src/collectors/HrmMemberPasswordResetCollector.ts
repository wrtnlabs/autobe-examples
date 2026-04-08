import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmMemberPasswordResetCollector {
  export async function collect(props: {
    body: IHrmMemberPasswordReset.ICreate;
  }) {
    const id: string = v4();
    const token: string = crypto.randomUUID();
    const now: Date = new Date();
    const expiresAt: Date = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    // Query member by email
    const member = await MyGlobal.prisma.hrm_members.findFirst({
      where: { email: props.body.email },
    });
    // Security: Do not throw error if member not found (prevent email enumeration)
    // Only create reset record if member exists
    if (!member) {
      // Return early without creating reset record
      return {
        id,
        token,
        expires_at: expiresAt,
        used_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        member: undefined as any,
      } satisfies Prisma.hrm_member_password_resetsCreateInput;
    }
    return {
      id,
      token,
      expires_at: expiresAt,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: member.id } },
    } satisfies Prisma.hrm_member_password_resetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmMemberPasswordResetCollector {
//         export async function collect(props: {
//           body: IHrmMemberPasswordReset.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       expires_at: ...,
//       used_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//           } satisfies Prisma.hrm_member_password_resetsCreateInput;
//         }
//       }
//--------------------------------------------------------------