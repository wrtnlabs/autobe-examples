import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { IMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoGuestSessionAtSummaryTransformer } from "../transformers/MultiUserTodoGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoGuestSessions(props: {
  guest: GuestPayload;
  body: IMultiUserTodoGuestSession.IRequest;
}): Promise<IPageIMultiUserTodoGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.multi_user_todo_guest_sessionsWhereInput = {
    guest: {
      id: props.guest.id,
      deleted_at: null,
    },
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
  } satisfies Prisma.multi_user_todo_guest_sessionsWhereInput;
  const data = await MyGlobal.prisma.multi_user_todo_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...MultiUserTodoGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.multi_user_todo_guest_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
