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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeRoleTransformer } from "../transformers/ErpHrmTimeRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmTimeRole.IUpdate;
}): Promise<IErpHrmTimeRole> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      is_builtin: true,
    },
  });
  const selectedOrganization =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
        erp_hrm_time_organization_id: role.erp_hrm_time_organization_id,
      },
      select: {
        id: true,
      },
    });
  if (selectedOrganization === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 409);
  }
  if (props.body.rolePermissions !== undefined) {
    const rolePermissions = props.body.rolePermissions;
    const permissionIds = rolePermissions.map(
      (item) => item.erpHrmTimePermissionId,
    );
    if (new Set(permissionIds).size !== permissionIds.length) {
      throw new HttpException("Duplicate permissions are not allowed", 422);
    }
    const permissions = await MyGlobal.prisma.erp_hrm_time_permissions.findMany(
      {
        where: {
          id: { in: permissionIds },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
    if (permissions.length !== permissionIds.length) {
      throw new HttpException("Invalid permission selected", 422);
    }
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.erp_hrm_time_roles.update({
        where: { id: role.id },
        data: {
          ...(props.body.name !== undefined && { name: props.body.name }),
          ...(props.body.description !== undefined && {
            description: props.body.description,
          }),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      await prisma.erp_hrm_time_role_permissions.deleteMany({
        where: { erp_hrm_time_role_id: role.id },
      });
      await prisma.erp_hrm_time_role_permissions.createMany({
        data: rolePermissions.map((item) => ({
          id: v4(),
          erp_hrm_time_role_id: role.id,
          erp_hrm_time_permission_id: item.erpHrmTimePermissionId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
      });
    });
  } else {
    await MyGlobal.prisma.erp_hrm_time_roles.update({
      where: { id: role.id },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: { id: role.id },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(updated);
}
