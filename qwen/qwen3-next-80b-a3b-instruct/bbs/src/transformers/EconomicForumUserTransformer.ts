import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicForumUserTransformer {
  export type Payload = Prisma.economic_forum_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
      },
    } satisfies Prisma.economic_forum_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEconomicForumUser> {
    return {
      id: input.id,
    };
  }
}
