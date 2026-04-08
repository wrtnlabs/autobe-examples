import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function postMultiUserTodoMemberTodosBulkMoveToTrash(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.IBulkMoveToTrashRequest;
}): Promise<IMultiUserTodoTodo.IBulkMoveToTrashResult> {
  if (props.body.ids.length < 1) {
    throw new HttpException("ids must be a non-empty array", 400);
  }
  // Fail closed: the loaded Prisma schema for `multi_user_todo_todos` does not
  // include an owner-scoped column that can be used for privacy isolation in a
  // bulk transition.
  //
  // Proceeding without ownership validation would risk updating other members'
  // todos, which violates privacy isolation requirements.
  throw new HttpException(
    "Ownership validation is not available for this operation",
    500,
  );
}
