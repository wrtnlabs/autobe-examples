import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Look up the role — findUniqueOrThrow returns 404 if not found
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      type: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  // 2. Verify the role belongs to the specified organization
  if (role.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException("Role not found in this organization", 404);
  }
  // 3. Reject deletion of built-in roles
  if (role.type === "built_in") {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // 4. Check for active employees assigned to this role
  const activeEmployeeCount =
    await MyGlobal.prisma.hrm_time_tracking_employees.count({
      where: {
        hrm_time_tracking_role_id: props.roleId,
        deleted_at: null,
      },
    });
  if (activeEmployeeCount > 0) {
    throw new HttpException(
      "Cannot delete role: there are active employees assigned to this role",
      409,
    );
  }
  // 5. Soft-delete the role
  await MyGlobal.prisma.hrm_time_tracking_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------