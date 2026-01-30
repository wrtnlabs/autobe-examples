import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserSession";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumUserSessionCollector {
  export async function collect(props: {
    body: IEconomicForumUserSession.ICreate;
    economicForumUsers: IEntity;
    economicForumUserSessions: IEntity;
    ip: string; // Server-extracted IP from request context
  }) {
    return {
      id: v4(),
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date().toISOString(),
      expired_at: new Date().toISOString(),
      user: {
        connect: { id: props.economicForumUsers.id },
      },
    } satisfies Prisma.economic_forum_user_sessionsCreateInput;
  }
}
