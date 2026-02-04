import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserSessionAtSummaryTransformer } from "../transformers/TodoAppUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserSessions(props: {
  user: UserPayload;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  const {
    user_id,
    created_at_start,
    created_at_end,
    ip_address,
    expires_at,
    status,
    cursor,
    limit = 100,
  } = props.body;
  // Build where condition for Prisma query
  const whereInput = {
    user_id,
    created_at: cursor
      ? { lt: cursor }
      : {
          gte: created_at_start,
          lte: created_at_end,
        },
    ip: ip_address,
    expired_at: expires_at,
  } satisfies Prisma.todo_app_user_sessionsWhereInput;
  // Query for data with cursor pagination
  const data = await MyGlobal.prisma.todo_app_user_sessions.findMany({
    where: whereInput,
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    ...TodoAppUserSessionAtSummaryTransformer.select(),
  });
  // get total count for pagination
  const total = await MyGlobal.prisma.todo_app_user_sessions.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppUserSessionAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
