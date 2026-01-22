import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppAccessTokenCollector {
  export async function collect(props: { body: ITodoAppAccessToken.ICreate }) {
    return {
      id: v4(),
      token: props.body.token,
      type: props.body.type,
      issued_at: new Date(props.body.issued_at),
      expired_at: new Date(props.body.expired_at),
      revoked_at: props.body.revoked_at
        ? new Date(props.body.revoked_at)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
      user: props.body.todo_app_user_id
        ? { connect: { id: props.body.todo_app_user_id } }
        : undefined,
      guest: props.body.todo_app_guest_id
        ? { connect: { id: props.body.todo_app_guest_id } }
        : undefined,
      userSession: props.body.todo_app_user_session_id
        ? { connect: { id: props.body.todo_app_user_session_id } }
        : undefined,
    } satisfies Prisma.todo_app_access_tokensCreateInput;
  }
}
