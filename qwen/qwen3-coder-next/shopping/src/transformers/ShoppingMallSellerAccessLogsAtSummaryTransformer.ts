import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccessLogs";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerAccessLogsAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        referrer: true,
        user_agent: true,
        geolocation: true,
        success: true,
        created_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerAccessLogs.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      referrer: input.referrer ?? undefined,
      userAgent: input.user_agent ?? undefined,
      geolocation: input.geolocation ?? undefined,
      success: input.success,
      createdAt: input.created_at.toISOString(),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
