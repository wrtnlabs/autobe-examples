import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallWishlistAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_wishlistsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_active: true,
            variants: {
              select: {
                stock_quantity: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_wishlistsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlist.ISummary> {
    const variants = input.product.variants;
    const hasStock = variants.some((v) => v.stock_quantity > 0);
    const stockStatus: "in-stock" | "out-of-stock" =
      input.product.is_active && hasStock ? "in-stock" : "out-of-stock";
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      product: {
        id: input.product.id,
        name: input.product.name,
        basePrice: Number(input.product.base_price),
        stockStatus,
      },
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
