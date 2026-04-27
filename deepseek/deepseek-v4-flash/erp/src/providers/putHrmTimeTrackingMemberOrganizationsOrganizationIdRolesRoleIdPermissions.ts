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

export async function putHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdate;
}): Promise<IHrmTimeTrackingRole> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirst({
      where: {
        id: props.organizationId,
        status: "active",
      },
      select: {
        id: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
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
    throw new HttpException("Role not found", 404);
  }
  if (role.type === "built_in") {
    throw new HttpException(
      "Built-in roles have fixed, non-modifiable permission sets",
      403,
    );
  }
  const VALID_PERMISSION_CODES: Set<string> = new Set([
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ]);
  const permissionCodes: string[] = props.body.permissionCodes ?? [];
  const invalidCodes: string[] = permissionCodes.filter(
    (code: string): boolean => !VALID_PERMISSION_CODES.has(code),
  );
  if (invalidCodes.length > 0) {
    throw new HttpException(
      `Invalid permission codes: ${invalidCodes.join(", ")}`,
      400,
    );
  }
  const uniqueCodes: string[] = [...new Set(permissionCodes)];
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.hrm_time_tracking_role_permissions.deleteMany({
      where: {
        hrm_time_tracking_role_id: props.roleId,
      },
    });
    if (uniqueCodes.length > 0) {
      await tx.hrm_time_tracking_role_permissions.createMany({
        data: uniqueCodes.map((code: string) => ({
          id: v4(),
          hrm_time_tracking_role_id: props.roleId,
          permission_code: code,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      });
    }
  });
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
// export async function putHrmTimeTrackingMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
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