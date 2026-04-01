import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeRolePermissionCollector } from "../collectors/ErpHrmTimeRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeRolePermissionTransformer } from "../transformers/ErpHrmTimeRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmTimeRolePermission.ICreate;
}): Promise<IErpHrmTimeRolePermission> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      deleted_at: true,
    },
  });
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  const permission =
    await MyGlobal.prisma.erp_hrm_time_permissions.findUniqueOrThrow({
      where: {
        id: props.body.erpHrmTimePermissionId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (permission.deleted_at !== null) {
    throw new HttpException("Permission not found", 404);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.erp_hrm_time_role_permissions.findFirst({
      where: {
        erp_hrm_time_role_id: role.id,
        erp_hrm_time_permission_id: permission.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      throw new HttpException("Role permission already exists", 409);
    }
    const created = await tx.erp_hrm_time_role_permissions.create({
      data: await ErpHrmTimeRolePermissionCollector.collect({
        body: props.body,
        role,
      }),
      ...ErpHrmTimeRolePermissionTransformer.select(),
    });
    return await ErpHrmTimeRolePermissionTransformer.transform(created);
  });
}
