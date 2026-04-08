import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function postErpHrmTimeMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmTimeRolePermission.ICreate;
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
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (
    membership === null ||
    membership.erp_hrm_time_organization_id !==
      role.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  const permissionKeys = [...new Set(props.body.permissionKeys)];
  const permissions = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
    },
    select: {
      id: true,
      key: true,
    },
  });
  if (permissions.length !== permissionKeys.length) {
    throw new HttpException("Unknown permission key", 400);
  }
  const existing = await MyGlobal.prisma.erp_hrm_time_role_permissions.findMany(
    {
      where: {
        erp_hrm_time_role_id: role.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_permission_id: true,
      },
    },
  );
  const existingIds = new Set(
    existing.map((row) => row.erp_hrm_time_permission_id),
  );
  const missing = permissions.filter(
    (permission) => !existingIds.has(permission.id),
  );
  if (missing.length > 0) {
    await MyGlobal.prisma.$transaction(
      missing.map((permission) =>
        MyGlobal.prisma.erp_hrm_time_role_permissions.create({
          data: {
            id: v4(),
            erp_hrm_time_role_id: role.id,
            erp_hrm_time_permission_id: permission.id,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        }),
      ),
    );
  }
  const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: {
      id: role.id,
    },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(updated);
}
