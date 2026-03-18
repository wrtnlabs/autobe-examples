import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
  const member = await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      employees: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          organization_id: true,
          role: {
            select: {
              id: true,
              name: true,
              built_in: true,
            },
          },
        },
      },
    },
  });
  const employee = member.employees[0];
  if (!employee) {
    throw new HttpException("Member not found in organization", 403);
  }
  const isOwner = employee.role.name === "Owner";
  const isManager = employee.role.name === "Manager";
  let hasOrgManagePermission = isOwner || isManager;
  if (!hasOrgManagePermission) {
    const orgManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: employee.role.id,
          permission: "org:manage",
          deleted_at: null,
        },
      });
    hasOrgManagePermission = orgManagePermission !== null;
  }
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden: org:manage permission required", 403);
  }
  const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: employee.organization_id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException("Role name already exists in organization", 409);
  }
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: await HrmPlatformRoleCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: employee.organization_id },
      hrmPlatformMembers: { id: props.member.id },
      hrmPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(created);
}
