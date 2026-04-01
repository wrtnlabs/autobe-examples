import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
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

export async function postErpHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTask.ICreate;
}): Promise<IErpHrmTimeTrackingTask> {
  return MyGlobal.prisma.$transaction(async (tx) => {
    const project = await tx.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
      },
    });
    const member = await tx.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.member.id as unknown as string },
      select: {
        id: true,
      },
    });
    const created = await tx.erp_hrm_time_tracking_tasks.create({
      data: {
        erp_hrm_time_tracking_project_id: project.id,
        erp_hrm_time_tracking_member_id: member.id,
        ...props.body,
      } as unknown as Parameters<
        typeof tx.erp_hrm_time_tracking_tasks.create
      >[0]["data"],
      select: {
        id: true,
        erp_hrm_time_tracking_project_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        title: true,
        description: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        parent_task_id: true,
        assigned_employee_id: true,
      },
    });
    const estimated_at_value = (
      created as unknown as {
        estimated_at?: Date | null;
      }
    ).estimated_at;
    const actual_at_value = (
      created as unknown as {
        actual_at?: Date | null;
      }
    ).actual_at;
    return {
      ...(created as unknown as Record<string, unknown>),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at ?? null,
      estimated_at:
        estimated_at_value instanceof Date
          ? toISOStringSafe(estimated_at_value)
          : null,
      actual_at:
        actual_at_value instanceof Date
          ? toISOStringSafe(actual_at_value)
          : null,
    } as unknown as IErpHrmTimeTrackingTask;
  });
}
