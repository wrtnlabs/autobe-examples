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

export async function deleteHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Retrieve role and verify it belongs to the organization
  const role = await MyGlobal.prisma.hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_organization_id: true,
      is_builtin: true,
      employeeAssignments: {
        select: { id: true },
      } satisfies Prisma.hrm_employeesFindManyArgs,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  // 3. Verify role belongs to the specified organization
  if (role.hrm_organization_id !== props.organizationId) {
    throw new HttpException("Role does not belong to this organization", 403);
  }
  // 4. Check if role is built-in (cannot be deleted)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // 5. Check if any employees are assigned to this role
  if (role.employeeAssignments.length > 0) {
    throw new HttpException("Cannot delete role with assigned employees", 409);
  }
  // 6. Soft delete the role
  await MyGlobal.prisma.hrm_roles.update({
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
// export async function deleteHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
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