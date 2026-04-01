import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskHistoryTransformer } from "../transformers/HrmPlatformTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTaskHistory> {
  const history =
    await MyGlobal.prisma.hrm_platform_task_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...HrmPlatformTaskHistoryTransformer.select(),
    });
  if (history.task.id !== props.taskId) {
    throw new HttpException("Not Found", 404);
  }
  if (history.task.hrm_platform_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { organization_id: true },
    },
  );
  await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
    where: {
      user_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
  });
  return await HrmPlatformTaskHistoryTransformer.transform(history);
}
