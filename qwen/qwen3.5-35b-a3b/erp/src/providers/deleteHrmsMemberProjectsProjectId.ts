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

export async function deleteHrmsMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      name: true,
      hrms_organization_id: true,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: organizationMember.hrms_organization_role_id,
    },
  });
  if (role === null) {
    throw new HttpException("Forbidden", 403);
  }
  const permissions =
    await MyGlobal.prisma.hrms_organization_role_permissions.findMany({
      where: {
        hrms_organization_role_id: role.id,
      },
      select: {
        permission: true,
      },
    });
  const hasProjectManage = permissions.some(
    (p) => p.permission === "project:manage",
  );
  if (!hasProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  const timelogCount = await MyGlobal.prisma.hrms_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException("Project has associated timelogs", 409);
  }
  const activeTaskCount = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      hrms_project_id: props.projectId,
      deleted_at: null,
      status: {
        in: ["todo", "in_progress", "in_review"],
      },
    },
  });
  if (activeTaskCount > 0) {
    throw new HttpException("Project has active tasks", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrms_project_members.deleteMany({
      where: { project_id: props.projectId },
    });
    await tx.hrms_tasks.deleteMany({
      where: { hrms_project_id: props.projectId },
    });
    await tx.hrms_projects.delete({
      where: { id: props.projectId },
    });
    await tx.hrms_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: project.hrms_organization_id,
        performed_by_id: props.member.id,
        action_type: "project.deleted",
        target_entity: "project",
        target_id: props.projectId,
        details: JSON.stringify({
          project_name: project.name,
          project_id: props.projectId,
        }),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  });
}
