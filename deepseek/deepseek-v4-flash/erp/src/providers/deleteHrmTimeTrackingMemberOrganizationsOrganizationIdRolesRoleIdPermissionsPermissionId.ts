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

export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // === AUTHORIZATION ===
  // Check if member is organization owner
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, hrm_time_tracking_member_id: true },
    });
  const isOwner = organization.hrm_time_tracking_member_id === props.member.id;
  if (!isOwner) {
    // Non-owner must have org:manage permission via their assigned role
    const employee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
        where: {
          hrm_time_tracking_member_id: props.member.id,
          hrm_time_tracking_organization_id: props.organizationId,
          status: "active",
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_role_id: true,
        },
      });
    const managePermission =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
        where: {
          hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
          permission_code: "org:manage",
          deleted_at: null,
        },
      });
    if (managePermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // === VALIDATE ROLE ===
  // Role must exist, belong to this organization, be active, and be of custom type
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      type: true,
    },
  });
  // Built-in roles (Owner, Manager, Employee) have fixed, immutable permission sets
  if (role.type !== "custom") {
    throw new HttpException(
      "Built-in roles have immutable permission sets and cannot be modified",
      422,
    );
  }
  // === VALIDATE PERMISSION MAPPING ===
  // Permission mapping must exist, belong to this role, and not already deleted
  await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
    where: {
      id: props.permissionId,
      hrm_time_tracking_role_id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // === SOFT DELETE ===
  await MyGlobal.prisma.hrm_time_tracking_role_permissions.update({
    where: { id: props.permissionId },
    data: {
      deleted_at: new Date().toISOString(),
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
// export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
//   permissionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------