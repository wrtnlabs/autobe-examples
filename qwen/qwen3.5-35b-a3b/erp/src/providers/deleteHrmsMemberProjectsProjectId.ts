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
  const { member, projectId } = props;
  // Fetch project with organization context for permission validation
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, hrms_organization_id: true, name: true },
  });
  // Validate member belongs to the same organization
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        hrms_organization_id: project.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch organization role for permission validation
  const organizationRole =
    await MyGlobal.prisma.hrms_organization_roles.findUnique({
      where: { id: organizationMember.hrms_organization_role_id },
      select: { name: true, is_builtin: true },
    });
  if (
    organizationRole === null ||
    (!organizationRole.name.toLowerCase().includes("admin") &&
      !organizationRole.name.toLowerCase().includes("manager"))
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate no associated timelogs (business rule: preserve historical data)
  const timelogCount = await MyGlobal.prisma.hrms_timelogs.count({
    where: { project_id: projectId, deleted_at: null },
  });
  if (timelogCount > 0) {
    throw new HttpException("Project has associated timelogs", 409);
  }
  // Validate no active tasks (todo, in_progress, or in_review)
  const activeTasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_project_id: projectId,
      deleted_at: null,
      status: {
        in: ["todo", "in_progress", "in_review"],
      },
    },
  });
  if (activeTasks.length > 0) {
    throw new HttpException("Project has active tasks", 409);
  }
  // Execute cascade deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete project memberships (child entities)
    await tx.hrms_project_members.deleteMany({
      where: { project_id: projectId, deleted_at: null },
    });
    // Delete tasks (child entities)
    await tx.hrms_tasks.deleteMany({
      where: { hrms_project_id: projectId, deleted_at: null },
    });
    // Delete project (parent entity)
    await tx.hrms_projects.delete({
      where: { id: projectId },
    });
  });
  // Log deletion activity for audit purposes
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: project.hrms_organization_id,
      performed_by_id: member.id,
      action_type: "project.deleted",
      target_entity: "project",
      target_id: projectId,
      details: JSON.stringify({ project_name: project.name }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
