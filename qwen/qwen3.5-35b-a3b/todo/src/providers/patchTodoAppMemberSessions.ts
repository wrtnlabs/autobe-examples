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

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.todo_app_member_sessionsWhereInput = {
    todo_app_member_id: props.member.id,
  };
  if (props.body.status === "active") {
    whereInput.expired_at = { gt: new Date() };
  } else if (props.body.status === "expired") {
    whereInput.expired_at = { lte: new Date() };
  }
  if (
    props.body.created_after !== null &&
    props.body.created_after !== undefined
  ) {
    whereInput.created_at = { gte: new Date(props.body.created_after) };
  }
  if (
    props.body.created_before !== null &&
    props.body.created_before !== undefined
  ) {
    whereInput.created_at = { lte: new Date(props.body.created_before) };
  }
  if (
    props.body.expired_after !== null &&
    props.body.expired_after !== undefined
  ) {
    whereInput.expired_at = { gte: new Date(props.body.expired_after) };
  }
  if (
    props.body.expired_before !== null &&
    props.body.expired_before !== undefined
  ) {
    whereInput.expired_at = { lte: new Date(props.body.expired_before) };
  }
  if (props.body.ip !== null && props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  const cursor = props.body.cursor ?? undefined;
  const take = props.body.take ?? 20;
  const direction = props.body.direction ?? "forward";
  const nullsLast = props.body.nullsLast ?? false;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.todo_app_member_sessionsOrderByWithRelationInput[] = [
    {
      [sortBy]: sortOrder,
    },
  ];
  if (cursor !== undefined) {
    const cursorObj: Prisma.todo_app_member_sessionsWhereInput = {
      created_at: { gt: new Date(cursor) },
    };
    if (sortOrder === "asc") {
      cursorObj.created_at = { lt: new Date(cursor) };
    }
    whereInput.AND = [cursorObj];
  }
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    orderBy,
    take: take > 100 ? 100 : take < 1 ? 1 : take,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  const limit = props.body.limit ?? 100;
  const page = props.body.page ?? 1;
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageITodoAppMemberSession.ISummary;
}
