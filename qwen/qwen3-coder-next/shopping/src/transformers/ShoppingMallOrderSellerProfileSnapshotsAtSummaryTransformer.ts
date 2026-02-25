import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_order_seller_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        approval_status: true,
      },
    } satisfies Prisma.shopping_mall_order_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderSellerProfileSnapshots.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      logo_image_url: input.logo_image_url ?? undefined,
      approval_status: input.approval_status,
    };
  }
}
