import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserSessionAtSummaryTransformer } from "../transformers/TodoAppUserSessionAtSummaryTransformer";

export async function patchTodoAppUserUserSessions(props: {
  user: UserPayload;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const pageSize = props.body.pageSize > 0 ? props.body.pageSize : 10;
  const skip = (page - 1) * pageSize;
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const where = {
    todo_app_user_id: props.user.id,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.createdFrom || props.body.createdTo
      ? {
          created_at: {
            ...(props.body.createdFrom ? { gte: props.body.createdFrom } : {}),
            ...(props.body.createdTo ? { lte: props.body.createdTo } : {}),
          },
        }
      : {}),
    ...(typeof props.body.expired === "boolean"
      ? {
          expired_at: props.body.expired ? { lte: now } : { gt: now },
        }
      : {}),
    ...(props.body.lastUpdatedFrom || props.body.lastUpdatedTo
      ? {
          updated_at: {
            ...(props.body.lastUpdatedFrom
              ? { gte: props.body.lastUpdatedFrom }
              : {}),
            ...(props.body.lastUpdatedTo
              ? { lte: props.body.lastUpdatedTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.userAgent ? { user_agent: props.body.userAgent } : {}),
  } satisfies Prisma.todo_app_user_sessionsWhereInput;
  const data = await MyGlobal.prisma.todo_app_user_sessions.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: { created_at: "desc" },
    ...TodoAppUserSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_user_sessions.count({ where });
  const transformedData = await Promise.all(
    data.map(TodoAppUserSessionAtSummaryTransformer.transform),
  );
  return {
    pagination: {
      current: page satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: pageSize satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: transformedData,
  };
}
