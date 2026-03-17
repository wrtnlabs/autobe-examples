import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      isActive: input.expired_at > new Date(),
    };
  }
}
