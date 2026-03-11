import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberPermanentDelete(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IMultiUserTodoTodo> {
  // Build WHERE clause for member-owned todos in trash
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: { not: null }, // Must be in trash
    ...(typeof props.body.is_completed === "boolean" && {
      is_completed: props.body.is_completed,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.multi_user_todo_todosWhereInput;
  // Build ORDER BY from sort params
  let orderByInput: Prisma.multi_user_todo_todosOrderByWithRelationInput;
  if (props.body.sort_by === "created_at") {
    orderByInput = { created_at: props.body.sort_direction || "desc" };
  } else if (props.body.sort_by === "start_date") {
    orderByInput = { start_date: props.body.sort_direction || "desc" };
  } else if (props.body.sort_by === "due_date") {
    orderByInput = { due_date: props.body.sort_direction || "desc" };
  } else {
    orderByInput = { created_at: "desc" };
  }
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Find first matching todo in trash with transformer select
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: 1,
    ...MultiUserTodoTodoTransformer.select(),
  });
  if (!todo) {
    throw new HttpException("No matching todo found in trash", 404);
  }
  // Need to fetch member to satisfy transformer expectation
  const member = await MyGlobal.prisma.multi_user_todo_members.findUnique({
    where: { id: todo.member.id },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // Construct object matching transformer's expected shape
  const transformInput = {
    ...todo,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      created_at: member.created_at,
    },
  };
  // Store transformed result before deletion
  const result = await MultiUserTodoTodoTransformer.transform(transformInput);
  // Delete trash entry first (if exists)
  await MyGlobal.prisma.multi_user_todo_todo_trash_entries.deleteMany({
    where: { multi_user_todo_todo_id: todo.id },
  });
  // Delete the todo (cascade will handle edit histories)
  await MyGlobal.prisma.multi_user_todo_todos.delete({
    where: { id: todo.id },
  });
  return result;
}
