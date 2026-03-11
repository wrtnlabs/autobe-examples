import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoViewStatCollector } from "../collectors/MultiUserTodoTodoViewStatCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoViewStatTransformer } from "../transformers/MultiUserTodoTodoViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberViewStats(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoViewStat.ICreate;
}): Promise<IMultiUserTodoTodoViewStat> {
  // Validate todo ownership for detail views
  if (props.body.view_type === "detail") {
    if (!props.body.multi_user_todo_todo_id) {
      throw new HttpException("Todo ID is required for detail views", 400);
    }
    // Verify the todo exists and belongs to the current member
    const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
      where: {
        id: props.body.multi_user_todo_todo_id,
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
    });
    if (!todo) {
      throw new HttpException("Todo not found or access denied", 404);
    }
  } else if (
    props.body.view_type === "list" &&
    props.body.multi_user_todo_todo_id
  ) {
    // List views should not have todo ID
    throw new HttpException("Todo ID should be null for list views", 400);
  }
  // Use collector to prepare database input
  const data = await MultiUserTodoTodoViewStatCollector.collect({
    body: props.body,
    multiUserTodoMembers: { id: props.member.id },
    multiUserTodoMemberSessions: { id: props.member.session_id },
  });
  // Create the view statistics record
  const created = await MyGlobal.prisma.multi_user_todo_todo_view_stats.create({
    data,
    ...MultiUserTodoTodoViewStatTransformer.select(),
  });
  // Transform to response DTO
  return await MultiUserTodoTodoViewStatTransformer.transform(created);
}
