import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemSellerSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_order_item_seller_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        logo_url: true,
        created_at: true,
        // orderItem and orderItemSnapshots not selected - not needed for this DTO
      },
    } satisfies Prisma.ecommerce_mall_order_item_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSellerSnapshot.ISummary> {
    return {
      id: input.id,
      shopName: input.shop_name,
      logoUrl: input.logo_url ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
