import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IUpdateStatus;
}): Promise<IHrmTimeTrackingTask> {
  if (
    props.body.status !== "open" &&
    props.body.status !== "in-progress" &&
    props.body.status !== "completed" &&
    props.body.status !== "closed"
  ) {
    throw new HttpException("Invalid task status", 400);
  }
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
        employee: {
          user_account_id: props.member.id,
          deleted_at: null,
        },
      },
      select: {
        is_project_lead: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (membership.is_project_lead === false) {
    throw new HttpException("Forbidden", 403);
  }
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (task.status === props.body.status) {
    const current =
      await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
        where: {
          id: task.id,
        },
        ...HrmTimeTrackingTaskTransformer.select(),
      });
    return await HrmTimeTrackingTaskTransformer.transform(current);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_tasks.update({
      where: {
        id: task.id,
      },
      data: {
        status: props.body.status,
        updated_at: new Date(),
      },
    });
    await tx.hrm_time_tracking_task_histories.create({
      data: {
        id: v4(),
        hrm_time_tracking_task_id: task.id,
        hrm_time_tracking_member_id: props.member.id,
        from_status: task.status,
        to_status: props.body.status,
        changed_at: new Date(),
      },
    });
    return await tx.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: {
        id: task.id,
      },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
  });
  return await HrmTimeTrackingTaskTransformer.transform(updated);
}
