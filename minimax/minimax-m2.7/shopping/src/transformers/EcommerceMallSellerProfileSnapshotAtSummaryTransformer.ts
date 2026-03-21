import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerProfileSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        created_at: true,
        sellerProfile: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? undefined,
      logo_url: input.logo_url ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
