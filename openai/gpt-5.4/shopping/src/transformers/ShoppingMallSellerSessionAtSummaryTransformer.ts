import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerSessionAtSummaryTransformer {
  export async function transform(
    input: ShoppingMallSellerSessionAtSummaryTransformer.Payload,
  ): Promise<IShoppingMallSellerSession.ISummary> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_sessionsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
}
