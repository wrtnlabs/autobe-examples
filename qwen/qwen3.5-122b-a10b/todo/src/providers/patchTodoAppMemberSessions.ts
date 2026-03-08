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
  // Verify member account is not deleted
  const member = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.member.id },
    select: { id: true, deleted_at: true },
  });
  if (member === null || member.deleted_at !== null) {
    throw new HttpException("Member account not found or deleted", 404);
  }
  // Build where clause with filters
  const now = new Date();
  const whereInput: Prisma.todo_app_member_sessionsWhereInput = {
    todo_app_member_id: props.member.id,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.expired_at_from && {
      expired_at: {
        gte: new Date(props.body.expired_at_from),
      },
    }),
    ...(props.body.expired_at_to && {
      expired_at: {
        lte: new Date(props.body.expired_at_to),
      },
    }),
    ...(props.body.ip && {
      ip: {
        contains: props.body.ip,
      },
    }),
    ...(props.body.status === "active" && {
      expired_at: {
        gt: now,
      },
    }),
    ...(props.body.status === "expired" && {
      expired_at: {
        lte: now,
      },
    }),
  };
  // Build order by clause
  const orderByInput: Prisma.todo_app_member_sessionsOrderByWithRelationInput =
    props.body.sort_by === "expired_at"
      ? { expired_at: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "ip"
        ? { ip: props.body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.sort_order === "asc" ? "asc" : "desc" };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch data
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppMemberSessionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageITodoAppMemberSession.ISummary;
}
