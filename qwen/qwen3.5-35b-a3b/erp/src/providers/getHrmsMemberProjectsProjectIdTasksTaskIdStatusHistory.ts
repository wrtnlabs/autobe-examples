import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTaskStatusHistoryAtSummaryTransformer } from "../transformers/HrmsTaskStatusHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberProjectsProjectIdTasksTaskIdStatusHistory(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTaskStatusHistory> {
  // Verify project exists and belongs to member's organization
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, hrms_organization_id: true },
  });
  // Verify task exists and belongs to the project
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Verify member has project:view permission
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (!organizationMember) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: organizationMember.hrms_organization_role_id,
    },
  });
  if (!role) {
    throw new HttpException("Forbidden", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrms_organization_role_permissions.findMany({
      where: {
        hrms_organization_role_id: role.id,
      },
    });
  if (
    !rolePermissions.some(
      (p: { permission: string }) => p.permission === "project:view",
    )
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Query status history
  const statusHistories =
    await MyGlobal.prisma.hrms_task_status_histories.findMany({
      where: {
        hrms_task_id: props.taskId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      ...HrmsTaskStatusHistoryAtSummaryTransformer.select(),
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    statusHistories,
    HrmsTaskStatusHistoryAtSummaryTransformer.transform,
  );
  return typia.assert<IHrmsTaskStatusHistory>(transformed);
}
