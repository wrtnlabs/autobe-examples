import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get current timestamp as ISO string for status filtering
  const currentTimestamp = toISOStringSafe(new Date());
  // Build where conditions
  const whereInput = {
    todo_app_user_id: props.user.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: currentTimestamp },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: currentTimestamp },
    }),
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.from_date && { created_at: { gte: props.body.from_date } }),
    ...(props.body.to_date && { created_at: { lte: props.body.to_date } }),
    ...(props.body.search && {
      OR: [
        { ip: { contains: props.body.search, mode: "insensitive" } },
        { href: { contains: props.body.search, mode: "insensitive" } },
        { referrer: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.todo_app_user_sessionsWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.todo_app_user_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppUserSessionAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.todo_app_user_sessions.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppUserSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
