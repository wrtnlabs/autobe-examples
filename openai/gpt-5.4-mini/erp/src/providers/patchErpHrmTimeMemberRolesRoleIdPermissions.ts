import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
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
  body: IErpHrmTimeRole.IUpdatePermission;
}): Promise<IErpHrmTimeRole> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      name: true,
      description: true,
      is_builtin: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (role.is_builtin) {
    const supportedBuiltIn =
      role.name === "Owner" ||
      role.name === "Manager" ||
      role.name === "Employee";
    if (!supportedBuiltIn) throw new HttpException("Forbidden", 403);
  }
  if (new Set(props.body.permissions).size !== props.body.permissions.length) {
    throw new HttpException("Invalid permission", 400);
  }
  const catalog = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    where: {
      key: { in: props.body.permissions },
    },
    select: {
      id: true,
      key: true,
      description: true,
    },
  });
  if (catalog.length !== props.body.permissions.length) {
    throw new HttpException("Invalid permission", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_role_permissions.deleteMany({
      where: {
        erp_hrm_time_role_id: role.id,
      },
    });
    await prisma.erp_hrm_time_role_permissions.createMany({
      data: catalog.map((permission) => ({
        id: v4(),
        erp_hrm_time_role_id: role.id,
        erp_hrm_time_permission_id: permission.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      })),
    });
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: {
      id: role.id,
    },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(updated);
}
