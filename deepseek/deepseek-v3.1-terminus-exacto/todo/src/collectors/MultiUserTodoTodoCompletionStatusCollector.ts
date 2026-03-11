import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoCompletionStatusCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodoCompletionStatus.ICreate;
    multiUserTodoTodos: IEntity; // from path parameter todoId
    multiUserTodoMembers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      is_completed: props.body.is_completed,
      created_at: new Date(),
      // BelongsTo relation - required
      todo: { connect: { id: props.multiUserTodoTodos.id } },
    } satisfies Prisma.multi_user_todo_todo_completion_statusesCreateInput;
  }
}
