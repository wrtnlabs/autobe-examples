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
import { ErpHrmTimeRoleCollector } from "../collectors/ErpHrmTimeRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeRoleTransformer } from "../transformers/ErpHrmTimeRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmTimeRole.ICreate;
}): Promise<IErpHrmTimeRole> {
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  if (organizationMembership === null)
    throw new HttpException("Forbidden", 403);
  const uniquePermissionIds = Array.from(
    new Set(props.body.permissions.map((permission) => permission.id)),
  );
  const approvedPermissions =
    await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
      where: {
        id: { in: uniquePermissionIds },
      },
      select: {
        id: true,
      },
    });
  if (approvedPermissions.length !== uniquePermissionIds.length) {
    throw new HttpException("Invalid permission requested", 400);
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const role = await tx.erp_hrm_time_roles.create({
        data: await ErpHrmTimeRoleCollector.collect({
          body: props.body,
          organization: {
            id: organizationMembership.erp_hrm_time_organization_id,
          },
        }),
        ...ErpHrmTimeRoleTransformer.select(),
      });
      await tx.erp_hrm_time_role_permissions.createMany({
        data: approvedPermissions.map((permission) => ({
          id: v4(),
          erp_hrm_time_role_id: role.id,
          erp_hrm_time_permission_id: permission.id,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
      });
      return role;
    });
    return await ErpHrmTimeRoleTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Role name already exists in this organization",
        409,
      );
    }
    throw error;
  }
}
