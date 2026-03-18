import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
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

export async function patchHrmPlatformMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTaskHistory.IRequest;
}): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
  await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    task_id: props.taskId,
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.old_status !== undefined && {
      old_status: props.body.old_status,
    }),
    ...(props.body.new_status !== undefined && {
      new_status: props.body.new_status,
    }),
    ...(props.body.user_id && {
      user_id: props.body.user_id,
    }),
  } satisfies Prisma.hrm_platform_task_historiesWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      old_status: true,
      new_status: true,
      created_at: true,
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_url: true,
          phone_number: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((history) => ({
      id: history.id,
      old_status: typia.assert<
        "completed" | "open" | "in-progress" | "closed" | null
      >(history.old_status),
      new_status: typia.assert<"completed" | "open" | "in-progress" | "closed">(
        history.new_status,
      ),
      created_at: toISOStringSafe(history.created_at),
      user: {
        id: history.user.id,
        email: history.user.email,
        display_name: history.user.display_name,
        avatar_url: history.user.avatar_url,
        phone_number: history.user.phone_number,
        created_at: toISOStringSafe(history.user.created_at),
      } satisfies IHrmPlatformMember.ISummary,
    })),
  };
}
