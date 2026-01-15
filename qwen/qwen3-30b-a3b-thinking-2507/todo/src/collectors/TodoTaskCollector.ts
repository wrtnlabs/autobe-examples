import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoTaskCollector {
  export async function collect(props: { body: ITodoTask.ICreate }) {
    return {
      id: v4(),
      title: props.body.title,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.todo_tasksCreateInput;
  }
}
