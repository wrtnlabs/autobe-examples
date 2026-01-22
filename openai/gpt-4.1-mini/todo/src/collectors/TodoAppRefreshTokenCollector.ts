import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppRefreshTokenCollector {
  export async function collect(props: {
    body: ITodoAppRefreshToken.ICreate;
    user: IEntity;
    userSession: IEntity;
  }) {
    return {
      id: v4(),
      refresh_token: props.body.refresh_token,
      created_at: new Date(),
      expired_at: new Date(props.body.expired_at),
      user: { connect: { id: props.user.id } },
      userSession: { connect: { id: props.userSession.id } },
    } satisfies Prisma.todo_app_refresh_tokensCreateInput;
  }
}
