import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmMemberPasswordResetCollector {
  export async function collect(props: {
    body: IErpHrmMemberPasswordReset.ICreate;
  }) {
    const member = await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });
    return {
      id: v4(),
      created_at: new Date(),
      expired_at: new Date(Date.now() + 3600000),
      token: v4(),
      updated_at: new Date(),
      member: { connect: { id: member.id } },
    } satisfies Prisma.erp_hrm_member_password_resetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmMemberPasswordResetCollector {
//         export async function collect(props: {
//           body: IErpHrmMemberPasswordReset.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       expired_at: ...,
//       token: ...,
//       updated_at: ...,
//       member: ...,
//           } satisfies Prisma.erp_hrm_member_password_resetsCreateInput;
//         }
//       }
//--------------------------------------------------------------