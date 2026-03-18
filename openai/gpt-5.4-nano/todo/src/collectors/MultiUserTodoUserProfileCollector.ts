import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoUserProfileCollector {
  export async function collect(props: {
    body: IMultiUserTodoUserProfile.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      display_name: props.body.display_name,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.multi_user_todo_user_profilesCreateInput;
  }
}
