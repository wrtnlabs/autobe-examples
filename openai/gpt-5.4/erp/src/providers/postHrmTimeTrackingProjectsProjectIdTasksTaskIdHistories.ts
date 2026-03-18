import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskHistoryCollector } from "../collectors/HrmTimeTrackingTaskHistoryCollector";
import { HrmTimeTrackingTaskHistoryTransformer } from "../transformers/HrmTimeTrackingTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories(props: {
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTaskHistory.ICreate;
}): Promise<IHrmTimeTrackingTaskHistory> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
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
  if (task.status === props.body.new_status) {
    throw new HttpException("Invalid status transition", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const history = await tx.hrm_time_tracking_task_histories.create({
      data: await HrmTimeTrackingTaskHistoryCollector.collect({
        body: props.body,
        task: {
          id: task.id,
        },
        actorType: "employee",
        oldStatus: task.status,
      }),
      select: {
        id: true,
      },
    });
    await tx.hrm_time_tracking_tasks.update({
      where: {
        id: props.taskId,
      },
      data: {
        status: props.body.new_status,
        updated_at: new Date(),
      },
    });
    return history;
  });
  const history =
    await MyGlobal.prisma.hrm_time_tracking_task_histories.findUniqueOrThrow({
      where: {
        id: created.id,
      },
      ...HrmTimeTrackingTaskHistoryTransformer.select(),
    });
  return await HrmTimeTrackingTaskHistoryTransformer.transform(history);
}
