import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdate;
}): Promise<IHrmTimeTrackingRole> {
  // 1. Validate role exists, belongs to org, and not soft-deleted
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // 2. Check org:manage permission
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "You are not an employee of this organization",
      403,
    );
  }
  const hasOrgManage =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "org:manage",
        deleted_at: null,
      },
    });
  if (hasOrgManage === null) {
    throw new HttpException("You do not have org:manage permission", 403);
  }
  // 3. Handle built-in roles
  if (role.type === "built_in") {
    if (props.body.name !== undefined) {
      throw new HttpException("Built-in roles cannot be renamed.", 422);
    }
    if (props.body.permissionCodes !== undefined) {
      throw new HttpException(
        "Built-in roles have fixed permission sets that cannot be modified.",
        422,
      );
    }
  }
  // 4. For custom roles, validate and update atomically
  if (role.type === "custom") {
    const newName = props.body.name;
    const newPermissionCodes = props.body.permissionCodes;
    if (newName !== undefined) {
      const existingName =
        await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
          where: {
            hrm_time_tracking_organization_id: props.organizationId,
            name: newName,
            id: { not: props.roleId },
            deleted_at: null,
          },
        });
      if (existingName !== null) {
        throw new HttpException(
          "A role with this name already exists in the organization.",
          422,
        );
      }
    }
    const hasNameUpdate = newName !== undefined;
    const hasPermissionUpdate = newPermissionCodes !== undefined;
    if (hasNameUpdate || hasPermissionUpdate) {
      await MyGlobal.prisma.$transaction(async (tx) => {
        if (hasNameUpdate) {
          await tx.hrm_time_tracking_roles.update({
            where: { id: props.roleId },
            data: {
              name: newName,
              updated_at: new Date().toISOString(),
            },
          });
        }
        if (hasPermissionUpdate) {
          // Hard-delete all existing permission mappings
          await tx.hrm_time_tracking_role_permissions.deleteMany({
            where: { hrm_time_tracking_role_id: props.roleId },
          });
          // Insert new permission mappings with deduplication
          const uniqueCodes = [...new Set(newPermissionCodes)];
          if (uniqueCodes.length > 0) {
            const now = new Date().toISOString();
            await tx.hrm_time_tracking_role_permissions.createMany({
              data: uniqueCodes.map((code) => ({
                id: v4(),
                hrm_time_tracking_role_id: props.roleId,
                permission_code: code,
                created_at: now,
                updated_at: now,
                deleted_at: null,
              })),
            });
          }
          // Bump updated_at on the role itself when only permissions change
          if (!hasNameUpdate) {
            await tx.hrm_time_tracking_roles.update({
              where: { id: props.roleId },
              data: {
                updated_at: new Date().toISOString(),
              },
            });
          }
        }
      });
    }
  }
  // 5. Return updated role with full response via Transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmTimeTrackingRoleTransformer.select(),
    });
  return await HrmTimeTrackingRoleTransformer.transform(updated);
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
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingRole.IUpdate;
// }): Promise<IHrmTimeTrackingRole> {
//   await MyGlobal.prisma.hrm_time_tracking_roles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingRoleTransformer.select(),
//   });
//   return await HrmTimeTrackingRoleTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------