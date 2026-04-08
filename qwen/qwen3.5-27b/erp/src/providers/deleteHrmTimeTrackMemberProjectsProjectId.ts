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

export async function deleteHrmTimeTrackMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
        deleted_at: true,
      },
    });
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const organization =
    await MyGlobal.prisma.hrm_time_track_organizations.findUnique({
      where: { id: project.hrm_time_track_organization_id },
      select: { id: true, deleted_at: true },
    });
  if (organization === null || organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: project.hrm_time_track_organization_id,
      deleted_at: null,
    },
    select: { id: true, hrm_time_track_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.hrm_time_track_role_id !== null) {
    const hasPermission =
      await MyGlobal.prisma.hrm_time_track_role_permissions.findFirst({
        where: {
          hrm_time_track_role_id: employee.hrm_time_track_role_id,
          permission: "project_management",
        },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Forbidden", 403);
  }
  const timelogCount = await MyGlobal.prisma.hrm_time_track_timelogs.count({
    where: {
      hrm_time_track_project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with existing timelogs. Remove all timelogs first.",
      400,
    );
  }
  const activityId = v4();
  const activityType = "project_deleted";
  const activityDescription = `Project deleted: ${project.id}`;
  const activityCreatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_track_tasks.deleteMany({
      where: {
        hrm_time_track_project_id: props.projectId,
        deleted_at: null,
      },
    });
    await tx.hrm_time_track_project_members.deleteMany({
      where: {
        hrm_time_track_project_id: props.projectId,
        deleted_at: null,
      },
    });
    await tx.hrm_time_track_projects.delete({
      where: { id: props.projectId },
    });
    await tx.hrm_time_track_activity_logs.create({
      data: {
        id: activityId,
        hrm_time_track_organization_id: project.hrm_time_track_organization_id,
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_project_id: props.projectId,
        activity_type: activityType,
        description: activityDescription,
        created_at: activityCreatedAt,
      },
    });
  });
}
