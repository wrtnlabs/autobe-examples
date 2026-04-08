import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRoleCollector } from "../collectors/HrmPlatformRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          hrm_platform_organization_id: props.body.organization_id,
        },
        select: { hrm_platform_organization_id: true },
      },
    );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        organization_id: props.body.organization_id,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: { hrm_platform_role_id: employee.role_id },
      select: { hrm_platform_permission_id: true },
    });
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      id: { in: rolePermissions.map((rp) => rp.hrm_platform_permission_id) },
    },
    select: { id: true, code: true },
  });
  const hasOrgManage = permissions.some((p) => p.code === "org:manage");
  const hasEmployeeManage = permissions.some(
    (p) => p.code === "employee:manage",
  );
  if (!hasOrgManage && !hasEmployeeManage) {
    throw new HttpException("Insufficient permissions to create roles", 403);
  }
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: await HrmPlatformRoleCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(created);
}
