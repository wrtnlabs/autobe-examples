import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicDiscussionBanCollector {
  export async function collect(props: {
    body: IEconomicDiscussionBan.ICreate;
    citizen: IEntity;
    admin: IEntity;
    reason: string; // Additional parameter for ban reason, since DTO is empty
  }) {
    return {
      id: v4(),
      reason: props.reason, // Get reason from additional parameter
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      citizen: {
        connect: { id: props.citizen.id },
      },
      admin: {
        connect: { id: props.admin.id },
      },
    } satisfies Prisma.economic_discussion_bansCreateInput;
  }
}
