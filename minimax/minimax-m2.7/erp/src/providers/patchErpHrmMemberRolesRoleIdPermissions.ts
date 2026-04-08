import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRolePermissionAtUpdateResultTransformer } from "../transformers/ErpHrmRolePermissionAtUpdateResultTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdatePermission;
}): Promise<IErpHrmRolePermission.IUpdateResult> {
  const VALID_PERMISSIONS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  // Get employee's organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in any organization", 403);
  }
  // Find role in organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  // Built-in roles cannot have permissions modified
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions of built-in roles", 400);
  }
  // Validate and de-duplicate permission codes
  const requestedPermissions = props.body.permissions ?? [];
  const invalidPermissions = requestedPermissions.filter(
    (p) => !VALID_PERMISSIONS.includes(p),
  );
  if (invalidPermissions.length > 0) {
    throw new HttpException(
      `Invalid permission codes: ${invalidPermissions.join(", ")}`,
      400,
    );
  }
  const uniquePermissions = [...new Set(requestedPermissions)];
  // Execute atomic transaction: delete old, insert new, update role
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_role_permissions.deleteMany({
      where: { erp_hrm_role_id: props.roleId },
    }),
    ...uniquePermissions.map((permission) =>
      MyGlobal.prisma.erp_hrm_role_permissions.create({
        data: {
          id: v4(),
          erp_hrm_role_id: props.roleId,
          permission,
          created_at: now,
          updated_at: now,
        },
      }),
    ),
    MyGlobal.prisma.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: { updated_at: now },
    }),
  ]);
  // Query updated permissions with transformer select
  const updatedPermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: { erp_hrm_role_id: props.roleId },
      ...ErpHrmRolePermissionAtUpdateResultTransformer.select(),
    });
  // Transform to response (cast to any to resolve circular type inference)
  return ErpHrmRolePermissionAtUpdateResultTransformer.transform(
    updatedPermissions as any,
  );
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IErpHrmRole.IUpdatePermission;
// }): Promise<IErpHrmRolePermission.IUpdateResult> {
//   const record = await MyGlobal.prisma.erp_hrm_role_permissions.findFirstOrThrow({
//     ...ErpHrmRolePermissionAtUpdateResultTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmRolePermissionAtUpdateResultTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------