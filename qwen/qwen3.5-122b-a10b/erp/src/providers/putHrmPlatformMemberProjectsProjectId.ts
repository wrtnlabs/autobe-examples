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
  // 1. Resource Validation - Find project and verify existence
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      name: true,
      description: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Business Rules - Check active timers if status changing to archived/completed
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
        "Cannot change status to archived or completed while active timers exist",
        409,
      );
    }
  }
  // 3. Validate date constraints
  const startDate =
    props.body.start_date ?? (project.start_date as string | null);
  const endDate = props.body.end_date ?? (project.end_date as string | null);
  if (startDate !== null && endDate !== null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw new HttpException(
        "End date must be greater than or equal to start date",
        400,
      );
    }
  }
  // 4. Validate budget_hours if provided
  if (
    props.body.budget_hours !== undefined &&
    props.body.budget_hours !== null
  ) {
    if (props.body.budget_hours <= 0) {
      throw new HttpException("Budget hours must be a positive number", 400);
    }
  }
  // 5. Update Logic - Apply partial updates
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: {
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
        start_date:
          props.body.start_date === null
            ? null
            : new Date(props.body.start_date),
      }),
      ...(props.body.end_date !== undefined && {
        end_date:
          props.body.end_date === null ? null : new Date(props.body.end_date),
      }),
      updated_at: new Date(),
    },
  });
  // 6. Response - Fetch and transform updated project
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
