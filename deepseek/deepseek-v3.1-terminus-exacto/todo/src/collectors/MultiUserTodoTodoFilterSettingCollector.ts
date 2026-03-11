import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoFilterSettingCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodoFilterSetting.ICreate;
    multiUserTodoMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      filter_type: props.body.filter_type,
      is_default: props.body.is_default,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.multiUserTodoMembers.id } },
    } satisfies Prisma.multi_user_todo_todo_filter_settingsCreateInput;
  }
}
