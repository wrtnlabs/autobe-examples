import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumEmailVerification";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumEmailVerificationCollector {
  export async function collect(props: {
    body: IEconomicForumEmailVerification.ICreate;
    economicForumAdmins: IEntity;
    economicForumAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      token: v4(),
      expires_at: new Date(Date.now() + 86400000),
      created_at: new Date(),
      deleted_at: null,
      admin: {
        connect: { id: props.economicForumAdmins.id },
      },
    } satisfies Prisma.economic_forum_admin_email_verificationsCreateInput;
  }
}
