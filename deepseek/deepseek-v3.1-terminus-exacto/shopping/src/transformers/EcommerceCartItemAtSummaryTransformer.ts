import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";

export namespace EcommerceCartItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceProductAtSummaryTransformer.select(),
        productVariant: EcommerceProductVariantAtSummaryTransformer.select(),
        shoppingCart: {
          select: {
            id: true,
            customer_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_shopping_cartsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCartItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      created_at: input.created_at.toISOString(),
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      variant: await EcommerceProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      price: input.productVariant.price_override ?? input.product.base_price,
    };
  }
}
