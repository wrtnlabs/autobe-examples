import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IUpdate;
}): Promise<IHrmPlatformProject> {
  // Step 1: Verify project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 2: Verify member has access to the organization
  // Check if member has an active employee record in this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check for project:manage permission via role
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      employeeAssignments: {
        some: {
          id: employee.id,
        },
      },
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
  const hasManagePermission = role?.permissions.some(
    (rp) => rp.permission.name === "project:manage",
  );
  if (hasManagePermission !== true) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Business rule - check for active timers if status is changing to archived/completed
  const newStatus = props.body.status ?? project.status;
  if (newStatus === "archived" || newStatus === "completed") {
    const activeTimerCount = await MyGlobal.prisma.hrm_platform_timers.count({
      where: {
        project_id: props.projectId,
        stopped_at: null,
      },
    });
    if (activeTimerCount > 0) {
      throw new HttpException(
        "Cannot change status to archived or completed while active timers exist on this project",
        409,
      );
    }
  }
  // Step 5: Build update data with partial updates
  const updateData: Prisma.hrm_platform_projectsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.color_code !== undefined && {
      color_code: props.body.color_code,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.budget_hours !== undefined && {
      budget_hours: props.body.budget_hours,
    }),
    ...(props.body.start_date !== undefined && {
      start_date: props.body.start_date,
    }),
    ...(props.body.end_date !== undefined && {
      end_date: props.body.end_date,
    }),
    updated_at: new Date(),
  };
  // Step 6: Perform the update
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Step 7: Fetch updated project and transform
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
