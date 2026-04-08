import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeInvitationTransformer } from "../transformers/HrmEmployeeInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmEmployeeInvitation> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  const invitation =
    await MyGlobal.prisma.hrm_employee_invitations.findUniqueOrThrow({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
      ...HrmEmployeeInvitationTransformer.select(),
    });
  if (invitation.organization.id !== employee.organization_id) {
    throw new HttpException(
      "Invitation does not belong to your current organization",
      403,
    );
  }
  return await HrmEmployeeInvitationTransformer.transform(invitation);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberInvitationsInvitationId(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<IHrmEmployeeInvitation> {
//   const record = await MyGlobal.prisma.hrm_employee_invitations.findFirstOrThrow({
//     ...HrmEmployeeInvitationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmEmployeeInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------