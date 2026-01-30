import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppUserRoleCollector {
  export async function collect(props: { body: ITodoAppUserRole.ICreate }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.body.todo_app_user_id } },
      role: { connect: { id: props.body.todo_app_role_id } },
    } satisfies Prisma.todo_app_user_rolesCreateInput;
  }
}
