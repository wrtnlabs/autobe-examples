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

export async function patchErpHrmTimeMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmTimeRole.IUpdate;
}): Promise<IErpHrmTimeRole> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
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
  if (props.body.rolePermissions === undefined) {
    const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
      where: {
        id: props.roleId,
      },
      ...ErpHrmTimeRoleTransformer.select(),
    });
    return await ErpHrmTimeRoleTransformer.transform(updated);
  }
  if (role.is_builtin) {
    throw new HttpException(
      "Built-in roles cannot have their permission set replaced",
      400,
    );
  }
  if (props.body.rolePermissions.length === 0) {
    throw new HttpException("Permission set cannot be empty", 400);
  }
  const permissionIds = props.body.rolePermissions.map(
    (item) => item.erpHrmTimePermissionId,
  );
  if (new Set(permissionIds).size !== permissionIds.length) {
    throw new HttpException("Duplicated permissions are not allowed", 400);
  }
  const permissions = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    where: {
      id: { in: permissionIds },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (permissions.length !== permissionIds.length) {
    throw new HttpException("Unsupported permission detected", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_role_permissions.deleteMany({
      where: {
        erp_hrm_time_role_id: props.roleId,
      },
    });
    await prisma.erp_hrm_time_role_permissions.createMany({
      data: permissionIds.map((permissionId) => ({
        id: v4(),
        erp_hrm_time_role_id: props.roleId,
        erp_hrm_time_permission_id: permissionId,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      })),
    });
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(updated);
}
