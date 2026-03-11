import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoViewStatCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodoViewStat.ICreate;
    multiUserTodoMembers: IEntity; // from authorized actor
    multiUserTodoMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      view_type: props.body.view_type,
      created_at: new Date(),
      // BelongsTo relations
      member: { connect: { id: props.multiUserTodoMembers.id } },
      todo: props.body.multi_user_todo_todo_id
        ? { connect: { id: props.body.multi_user_todo_todo_id } }
        : undefined,
    } satisfies Prisma.multi_user_todo_todo_view_statsCreateInput;
  }
}
