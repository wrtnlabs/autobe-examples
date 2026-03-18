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
import { HrmTimeTrackingTaskHistoryTransformer } from "../transformers/HrmTimeTrackingTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTaskHistory> {
  const history =
    await MyGlobal.prisma.hrm_time_tracking_task_histories.findFirstOrThrow({
      where: {
        id: props.historyId,
        deleted_at: null,
        task: {
          id: props.taskId,
          deleted_at: null,
          hrm_time_tracking_project_id: props.projectId,
          project: {
            deleted_at: null,
          },
        },
      },
      ...HrmTimeTrackingTaskHistoryTransformer.select(),
    });
  return await HrmTimeTrackingTaskHistoryTransformer.transform(history);
}
