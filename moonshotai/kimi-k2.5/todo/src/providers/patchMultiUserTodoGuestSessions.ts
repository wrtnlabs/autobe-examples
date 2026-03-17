import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "../transformers/MultiUserTodoMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoGuestSessions(props: {
  guest: GuestPayload;
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    multi_user_todo_member_id: props.guest.id,
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
    ...((props.body.createdAtFrom || props.body.createdAtTo) && {
      created_at: {
        ...(props.body.createdAtFrom && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
    ...((props.body.expiredAtFrom || props.body.expiredAtTo) && {
      expired_at: {
        ...(props.body.expiredAtFrom && {
          gte: new Date(props.body.expiredAtFrom),
        }),
        ...(props.body.expiredAtTo && {
          lte: new Date(props.body.expiredAtTo),
        }),
      },
    }),
  } satisfies Prisma.multi_user_todo_member_sessionsWhereInput;
  const sessions =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...MultiUserTodoMemberSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.multi_user_todo_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      sessions,
      MultiUserTodoMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
