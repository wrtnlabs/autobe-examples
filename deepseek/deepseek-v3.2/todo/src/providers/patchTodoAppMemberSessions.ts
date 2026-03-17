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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with member isolation and filters
  const where: Prisma.todo_app_member_sessionsWhereInput = {
    todo_app_member_id: props.member.id,
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expired_at_from && {
      expired_at: { gte: new Date(props.body.expired_at_from) },
    }),
    ...(props.body.expired_at_to && {
      expired_at: { lte: new Date(props.body.expired_at_to) },
    }),
    ...(props.body.is_expired !== undefined &&
      props.body.is_expired !== null && {
        expired_at: props.body.is_expired
          ? { lt: new Date() }
          : { gt: new Date() },
      }),
  };
  // Determine ORDER BY
  const orderByField = props.body.sort ?? "created_at";
  const orderByDirection = props.body.direction ?? "desc";
  const orderBy: Prisma.todo_app_member_sessionsOrderByWithRelationInput = {
    [orderByField]: orderByDirection,
  };
  // Query with pagination and transformer select
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...TodoAppMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_member_sessions.count({ where }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppMemberSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
