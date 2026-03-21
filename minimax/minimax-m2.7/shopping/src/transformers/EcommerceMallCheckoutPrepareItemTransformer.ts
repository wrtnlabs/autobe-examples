import { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCheckoutPrepareItemTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        cart: {
          select: {
            id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            optionValues: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    seller_profiles: {
                      select: {
                        shop_name: true,
                      },
                    },
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    description: true,
                    parent_id: true,
                  },
                },
                productImages: {
                  select: {
                    image_url: true,
                  },
                },
                variants: {
                  select: {
                    price: true,
                  },
                },
                reviews: {
                  select: {
                    rating: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCheckoutPrepareItem> {
    const validatedPrice =
      input.productVariant.price ?? input.productVariant.product.base_price;
    const subtotal = validatedPrice * input.quantity;
    const isVariantDeleted = input.productVariant.deleted_at !== null;
    const isProductDeleted = input.productVariant.product.deleted_at !== null;
    const hasStock = input.productVariant.quantity >= input.quantity;
    let status: IEcommerceMallCheckoutPrepareItem["status"];
    if (isVariantDeleted || isProductDeleted) {
      status = "unavailable";
    } else if (!hasStock) {
      status = "insufficient_stock";
    } else {
      status = "available";
    }
    return {
      id: input.id,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.productVariant.product,
      ),
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      quantity: input.quantity,
      validatedPrice,
      subtotal,
      status,
    };
  }
}
