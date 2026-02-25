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
import { EcommerceProductVariantTransformer } from "./EcommerceProductVariantTransformer";

export namespace EcommerceCartItemTransformer {
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
        productVariant: EcommerceProductVariantTransformer.select(),
        shoppingCart: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_shopping_cartsFindManyArgs,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_cart_itemsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceCartItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      productVariant: await EcommerceProductVariantTransformer.transform(
        input.productVariant,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
