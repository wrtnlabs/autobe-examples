import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    },
  );
  const requestingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (!requestingEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: requestingEmployee.role_id,
      },
      select: {
        hrm_platform_permission_id: true,
      },
    });
  const permissionIds = rolePermissions.map(
    (rp) => rp.hrm_platform_permission_id,
  );
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      id: { in: permissionIds },
    },
    select: {
      code: true,
    },
  });
  const hasPermission = permissions.some((p) => p.code === "project:manage");
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const targetEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUnique({
      where: {
        id: props.employeeId,
        organization_id: project.organization_id,
        deleted_at: null,
      },
    });
  if (!targetEmployee) {
    throw new HttpException("Not Found", 404);
  }
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.employeeId,
      },
    });
  if (!membership) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.hrm_platform_project_members.delete({
    where: {
      id: membership.id,
    },
  });
}
