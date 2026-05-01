import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmMemberEmailVerificationCollector {
  export async function collect(props: {
    body: IErpHrmMemberEmailVerification.ICreate;
    member: IEntity;
  }) {
    const memberRecord = await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow(
      {
        where: { id: props.member.id },
      },
    );
    return {
      id: v4(),
      token: props.body.token,
      email: memberRecord.email,
      expires_at: new Date(Date.now() + 86400000),
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.erp_hrm_member_email_verificationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmMemberEmailVerificationCollector {
//         export async function collect(props: {
//           body: IErpHrmMemberEmailVerification.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       email: ...,
//       expires_at: ...,
//       verified_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//           } satisfies Prisma.erp_hrm_member_email_verificationsCreateInput;
//         }
//       }
//--------------------------------------------------------------