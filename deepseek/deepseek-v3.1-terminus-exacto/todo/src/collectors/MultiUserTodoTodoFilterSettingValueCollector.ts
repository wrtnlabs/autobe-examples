import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoFilterSettingValueCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodoFilterSettingValue.ICreate;
    multiUserTodoTodoFilterSettings: IEntity; // from path parameter filterSettingId
    multiUserTodoMembers: IEntity; // from authorized actor
    multiUserTodoMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      id,
      key: props.body.key,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      filterSetting: {
        connect: { id: props.multiUserTodoTodoFilterSettings.id },
      },
    } satisfies Prisma.multi_user_todo_todo_filter_setting_valuesCreateInput;
  }
}
