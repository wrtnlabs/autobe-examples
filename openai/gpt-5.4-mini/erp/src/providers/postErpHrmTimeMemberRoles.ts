import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
  const organization =
    await MyGlobal.prisma.erp_hrm_time_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        erp_hrm_time_member_id: props.member.id,
        expired_at: { gt: new Date() },
      },
      select: {
        member: {
          select: {
            organizationMemberships: {
              select: {
                id: true,
                organization: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  const selectedMembership = organization.member.organizationMemberships[0];
  if (selectedMembership === undefined)
    throw new HttpException("Organization context missing", 400);
  if (props.body.name.length === 0) {
    throw new HttpException("Role name is required", 400);
  }
  if (props.body.permissions !== undefined) {
    const permissionIds = props.body.permissions.map(
      (permission) => permission.id,
    );
    const uniquePermissionIds = Array.from(new Set(permissionIds));
    if (uniquePermissionIds.length !== permissionIds.length) {
      throw new HttpException("Duplicate permissions are not allowed", 400);
    }
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const role = await prisma.erp_hrm_time_roles.create({
      data: await ErpHrmTimeRoleCollector.collect({
        body: {
          name: props.body.name,
          description: props.body.description,
        },
        organization: {
          id: selectedMembership.organization.id,
        },
      }),
    });
    if (
      props.body.permissions !== undefined &&
      props.body.permissions.length > 0
    ) {
      const permissions = await prisma.erp_hrm_time_permissions.findMany({
        where: {
          id: { in: props.body.permissions.map((permission) => permission.id) },
        },
        select: {
          id: true,
        },
      });
      if (permissions.length !== props.body.permissions.length) {
        throw new HttpException("Invalid permission", 400);
      }
      await prisma.erp_hrm_time_role_permissions.createMany({
        data: permissions.map((permission) => ({
          id: v4(),
          erp_hrm_time_role_id: role.id,
          erp_hrm_time_permission_id: permission.id,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
      });
    }
    return role;
  });
  const response = await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
    where: { id: created.id },
    ...ErpHrmTimeRoleTransformer.select(),
  });
  return await ErpHrmTimeRoleTransformer.transform(response);
}
