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

export async function putErpHrmTimeMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmTimeRole.IUpdate;
}): Promise<IErpHrmTimeRole> {
  const current = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      is_builtin: true,
    },
  });
  if (current.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  const permissionIds =
    props.body.permissions?.map((permission) => permission.id) ?? [];
  if (permissionIds.length > 0) {
    const permissions = await MyGlobal.prisma.erp_hrm_time_permissions.findMany(
      {
        where: { id: { in: permissionIds } },
        select: { id: true },
      },
    );
    if (permissions.length !== permissionIds.length) {
      throw new HttpException("Unknown permission in role update", 400);
    }
  }
  try {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.erp_hrm_time_roles.update({
        where: { id: props.roleId },
        data: {
          ...(props.body.name !== undefined && { name: props.body.name }),
          ...(props.body.description !== undefined && {
            description: props.body.description,
          }),
          updated_at: new Date(),
        },
      });
      if (props.body.permissions !== undefined) {
        await prisma.erp_hrm_time_role_permissions.deleteMany({
          where: { erp_hrm_time_role_id: props.roleId },
        });
        if (props.body.permissions.length > 0) {
          await prisma.erp_hrm_time_role_permissions.createMany({
            data: props.body.permissions.map((permission) => ({
              id: v4(),
              erp_hrm_time_role_id: props.roleId,
              erp_hrm_time_permission_id: permission.id,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          });
        }
      }
    });
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
  const updated = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(updated);
}
