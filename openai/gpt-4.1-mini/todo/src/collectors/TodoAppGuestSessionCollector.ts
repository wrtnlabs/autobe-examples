import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppGuestSessionCollector {
  export async function collect(props: {
    body: ITodoAppGuestSession.ICreate;
    todoAppGuest: IEntity;
    ip: string;
  }) {
    return {
      id: v4(),
      ip: props.body.ip ?? props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: new Date(props.body.expiresAt),
      guest: { connect: { id: props.todoAppGuest.id } },
    } satisfies Prisma.todo_app_guest_sessionsCreateInput;
  }
}
