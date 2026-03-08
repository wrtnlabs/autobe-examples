import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        variant: {
          select: {
            id: true,
            stock_quantity: true,
            price_override: true,
            sku_code: true,
            is_active: true,
            product: EcommerceMallProductAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem.ISummary> {
    const stockQuantity = input.variant.stock_quantity;
    const itemQuantity = input.quantity;
    let availability: "available" | "low_stock" | "out_of_stock";
    if (stockQuantity === 0) {
      availability = "out_of_stock";
    } else if (stockQuantity >= itemQuantity) {
      availability = "available";
    } else {
      availability = "low_stock";
    }
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      availability,
    };
  }
}
