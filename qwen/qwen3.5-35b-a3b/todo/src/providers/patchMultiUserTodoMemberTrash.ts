import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoAtSummaryTransformer } from "../transformers/MultiUserTodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTrash(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.multi_user_todo_todosWhereInput = {
    is_deleted: true,
    multi_user_todo_member_id: props.member.id,
    ...(props.body.status === "complete" && { is_complete: true }),
    ...(props.body.status === "incomplete" && { is_complete: false }),
  };
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder;
  const buildOrderBy =
    (): Prisma.multi_user_todo_todosOrderByWithRelationInput => {
      const direction = sortOrder ?? (sortBy === "created_at" ? "desc" : "asc");
      if (sortBy === "created_at") {
        return { created_at: direction };
      } else if (sortBy === "start_date" || sortBy === "due_date") {
        return {
          [sortBy]: {
            sort: direction,
            nullsLast: true,
          },
        };
      }
      return { created_at: "desc" };
    };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildOrderBy(),
      ...MultiUserTodoTodoAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_todos.count({ where }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    MultiUserTodoTodoAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
