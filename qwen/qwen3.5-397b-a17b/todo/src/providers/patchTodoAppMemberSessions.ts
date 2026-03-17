import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const whereInput = {
    member_id: props.member.id,
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
    ...(props.body.expired_from && {
      expired_at: { gte: new Date(props.body.expired_from) },
    }),
    ...(props.body.expired_to && {
      expired_at: { lte: new Date(props.body.expired_to) },
    }),
  } satisfies Prisma.todo_app_member_sessionsWhereInput;
  const orderByInput =
    sort === "expired_at"
      ? ({
          expired_at: direction,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput)
      : ({
          created_at: direction,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: session.created_at.toISOString(),
      expired_at: session.expired_at.toISOString(),
    })),
  } satisfies IPageITodoAppMemberSession.ISummary;
}
