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
import { HrmTimeTrackingRolePermissionCollector } from "../collectors/HrmTimeTrackingRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRolePermissionTransformer } from "../transformers/HrmTimeTrackingRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRolePermission.ICreate;
}): Promise<IHrmTimeTrackingRolePermission> {
  // 1. Verify the caller holds org:manage permission within the organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const orgManagePermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "org:manage",
        deleted_at: null,
      },
    });
  if (orgManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify the role exists and belongs to the organization
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
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
  if (role === null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Verify the role type is 'custom' — built-in roles have immutable permission sets
  if (role.type !== "custom") {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate permission_code is one of the 9 valid system permission codes
  const validPermissions: string[] = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  if (!validPermissions.includes(props.body.permission_code)) {
    throw new HttpException("Bad Request", 400);
  }
  // 5. Check for existing assignment
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: props.roleId,
        permission_code: props.body.permission_code,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  // If a non-deleted row exists, return 409 Conflict
  if (existing !== null && existing.deleted_at === null) {
    throw new HttpException("Conflict", 409);
  }
  let record: HrmTimeTrackingRolePermissionTransformer.Payload;
  if (existing !== null && existing.deleted_at !== null) {
    // Restore soft-deleted record by clearing deleted_at and updating updated_at
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.update({
      where: { id: existing.id },
      data: {
        deleted_at: null,
        updated_at: new Date(),
      },
    });
    // Fetch the restored record with full transformer select
    record =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findUniqueOrThrow(
        {
          where: { id: existing.id },
          ...HrmTimeTrackingRolePermissionTransformer.select(),
        },
      );
  } else {
    // Create new record using the collector
    record = await MyGlobal.prisma.hrm_time_tracking_role_permissions.create({
      data: await HrmTimeTrackingRolePermissionCollector.collect({
        body: props.body,
        hrmTimeTrackingRoles: { id: props.roleId },
      }),
      ...HrmTimeTrackingRolePermissionTransformer.select(),
    });
  }
  return await HrmTimeTrackingRolePermissionTransformer.transform(record);
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
// import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingRolePermission.ICreate;
// }): Promise<IHrmTimeTrackingRolePermission> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_role_permissions.create({
//     data: await HrmTimeTrackingRolePermissionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingRolePermissionTransformer.select(),
//   });
//   return await HrmTimeTrackingRolePermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------