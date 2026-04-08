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
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    ...(props.body.status === "active" && { expired_at: { gt: new Date() } }),
    ...(props.body.status === "expired" && { expired_at: { lte: new Date() } }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
  } satisfies Prisma.todo_app_member_sessionsWhereInput;
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "created_at";
    const sortOrder = props.body.sortOrder ?? "desc";
    switch (sortBy) {
      case "created_at":
        return {
          created_at: sortOrder,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput;
      case "expired_at":
        return {
          expired_at: sortOrder,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput;
      case "ip":
        return {
          ip: sortOrder,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput;
      case "href":
        return {
          href: sortOrder,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput;
      default:
        return {
          created_at: "desc" as const,
        } satisfies Prisma.todo_app_member_sessionsOrderByWithRelationInput;
    }
  })();
  const records = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
