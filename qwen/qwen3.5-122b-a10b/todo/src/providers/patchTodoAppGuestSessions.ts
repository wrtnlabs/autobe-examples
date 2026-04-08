import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuestSessions(props: {
  guest: GuestPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.todo_app_member_sessionsWhereInput = {
    deleted_at: null,
    ...(props.body.created_at_from
      ? {
          created_at: {
            gte: props.body.created_at_from,
          },
        }
      : {}),
    ...(props.body.created_at_to
      ? {
          created_at: {
            lte: props.body.created_at_to,
          },
        }
      : {}),
    ...(props.body.expired_at_from
      ? {
          expired_at: {
            gte: props.body.expired_at_from,
          },
        }
      : {}),
    ...(props.body.expired_at_to
      ? {
          expired_at: {
            lte: props.body.expired_at_to,
          },
        }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }
      : {}),
  } satisfies Prisma.todo_app_member_sessionsWhereInput;
  const orderByInput: Prisma.todo_app_member_sessionsOrderByWithRelationInput =
    props.body.sortBy === "expired_at"
      ? { expired_at: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...TodoAppMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_member_sessions.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageITodoAppMemberSession.ISummary;
}
