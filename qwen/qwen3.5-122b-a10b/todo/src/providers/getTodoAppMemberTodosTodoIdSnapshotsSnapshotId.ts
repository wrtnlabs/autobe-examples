import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppSnapshotTransformer } from "../transformers/TodoAppSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppSnapshot> {
  const snapshot = await MyGlobal.prisma.todo_app_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      todo_app_todos_id: props.todoId,
      todo: {
        todo_app_member_id: props.member.id,
      },
    },
    ...TodoAppSnapshotTransformer.select(),
  });
  return await TodoAppSnapshotTransformer.transform(snapshot);
}
