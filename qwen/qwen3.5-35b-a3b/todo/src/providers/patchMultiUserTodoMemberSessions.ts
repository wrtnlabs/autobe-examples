import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
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
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "../transformers/MultiUserTodoMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberSessions(props: {
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = toISOStringSafe(new Date());
  const baseWhere: Prisma.multi_user_todo_member_sessionsWhereInput = {
    ...(props.body.member_id && {
      multi_user_todo_member_id: props.body.member_id,
    }),
    ...(props.body.created_at_gte && {
      created_at: { gte: props.body.created_at_gte },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: props.body.created_at_lte },
    }),
    ...(props.body.expired_at_gte && {
      expired_at: { gte: props.body.expired_at_gte },
    }),
    ...(props.body.expired_at_lte && {
      expired_at: { lte: props.body.expired_at_lte },
    }),
  };
  const statusFilter: Prisma.multi_user_todo_member_sessionsWhereInput = {
    ...(props.body.status === "active" && {
      expired_at: { gt: now },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: now },
    }),
  };
  const whereInput =
    props.body.status === "all" || !props.body.status
      ? baseWhere
      : {
          AND: [baseWhere, statusFilter],
        };
  const sortOrder: Prisma.SortOrder =
    props.body.sort_order === "asc" ? "asc" : "desc";
  const orderBy =
    props.body.sort_by === "expired_at"
      ? [
          {
            expired_at: sortOrder,
            nulls: "last",
          },
        ]
      : props.body.sort_by === "ip"
        ? [
            {
              ip: sortOrder,
            },
          ]
        : [
            {
              created_at: sortOrder,
            },
          ];
  const records =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findMany({
      where: whereInput,
      orderBy,
      skip,
      take: limit,
      include: {
        member: {
          include: {
            sessions: true,
            passwordReset: true,
            emailVerifications: true,
            todos: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.multi_user_todo_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      MultiUserTodoMemberSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMultiUserTodoMemberSession.ISummary;
}
