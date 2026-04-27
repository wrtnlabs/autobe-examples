import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationTransformer } from "../transformers/HrmTimeTrackingInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getHrmTimeTrackingMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingInvitation> {
  // Step 1: Query invitation by ID ensuring it is not soft-deleted
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findFirst({
      where: {
        id: props.invitationId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (invitation === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 2: Verify the member has an active employee record in the
  // invitation's organization. This enforces cross-organization isolation:
  // members cannot see invitations belonging to organizations they
  // do not belong to.
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        invitation.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 3: Check the employee's role has the required `employee:manage`
  // permission (Section 341 — Permission-Based Invitation Denials).
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch full invitation record with all related data
  const record =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...HrmTimeTrackingInvitationTransformer.select(),
    });
  // Step 5: Transform to API response DTO
  return await HrmTimeTrackingInvitationTransformer.transform(record);
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
// import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberInvitationsInvitationId(props: {
//   member: MemberPayload;
//   invitationId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingInvitation> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_invitations.findFirstOrThrow({
//     ...HrmTimeTrackingInvitationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------