import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberAtSummaryTransformer } from "../transformers/HrmPlatformProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectMember.ISummary[]> {
  // Validate project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId, deleted_at: null },
      select: { id: true, organization_id: true },
    },
  );
  // Get the member's employee record in this organization to verify access
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        role: {
          select: {
            id: true,
            rolePermissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs,
  );
  if (!memberEmployee) {
    throw new HttpException("Member does not belong to this organization", 403);
  }
  // Check if user has project:manage permission or is a project member
  const hasManagePermission = memberEmployee.role.rolePermissions.some(
    (rp) => rp.permission.code === "project:manage",
  );
  if (!hasManagePermission) {
    // Verify user is a member of this project
    const isProjectMember =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_project_id: props.projectId,
          hrm_platform_employee_id: memberEmployee.id,
        },
      });
    if (!isProjectMember) {
      throw new HttpException(
        "Access denied: Not a member of this project",
        403,
      );
    }
  }
  // Query all project members with active employees only
  const members = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: {
      hrm_platform_project_id: props.projectId,
      employee: {
        status: "active",
        deleted_at: null,
      },
    },
    ...HrmPlatformProjectMemberAtSummaryTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    members,
    HrmPlatformProjectMemberAtSummaryTransformer.transform,
  );
}
