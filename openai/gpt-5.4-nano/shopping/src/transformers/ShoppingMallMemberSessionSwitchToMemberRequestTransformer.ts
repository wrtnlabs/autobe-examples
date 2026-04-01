import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberSessionSwitchToMemberRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSessionSwitchToMemberRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMemberSessionSwitchToMemberRequestTransformer {
  export type Payload = Prisma.shopping_mall_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        href: true,
        referrer: true,
        ip: true,
        created_at: true,
        expired_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMemberSessionSwitchToMemberRequest> {
    return {
      href: input.href,
      referrer: input.referrer,
      ip: input.ip.length ? input.ip : undefined,
    };
  }
}
