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
import { HrmTimeTrackingRolePermissionTransformer } from "../transformers/HrmTimeTrackingRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingRolePermission> {
  // Verify the member is an active employee of the organization
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
      },
    });
  // Check if the employee's role has org:manage permission
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "org:manage",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the role-permission mapping record with organization-scoped isolation
  const record =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
      ...HrmTimeTrackingRolePermissionTransformer.select(),
      where: {
        id: props.permissionId,
        role: {
          id: props.roleId,
          hrm_time_tracking_organization_id: props.organizationId,
        },
      },
    });
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
// export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
//   permissionId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingRolePermission> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
//     ...HrmTimeTrackingRolePermissionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingRolePermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------