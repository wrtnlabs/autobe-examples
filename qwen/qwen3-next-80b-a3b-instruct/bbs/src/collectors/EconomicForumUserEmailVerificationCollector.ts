import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserEmailVerification";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumUserEmailVerificationCollector {
  export async function collect(props: {
    body: IEconomicForumUserEmailVerification.ICreate;
    economicForumUsers: IEntity;
    economicForumUserSessions: IEntity;
  }) {
    return {
      id: v4(),
      token: v4(),
      created_at: new Date(),
      expired_at: new Date(Date.now() + 3600000),
      deleted_at: null,
      user: {
        connect: { id: props.economicForumUsers.id },
      },
    } satisfies Prisma.economic_forum_user_email_verificationsCreateInput;
  }
}
