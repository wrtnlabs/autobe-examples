import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCartItemTransformer {
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
            created_at: true,
            updated_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                deleted_at: true,
                profile: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
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
            optionValues: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
                productVariant: {
                  select: {
                    id: true,
                    sku_code: true,
                    price: true,
                    quantity: true,
                    created_at: true,
                    updated_at: true,
                    optionValues: true,
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
  ): Promise<IEcommerceMallCartItem> {
    const product_variant: IEcommerceMallProductVariant.ISummary = {
      id: input.productVariant.id,
      sku_code: input.productVariant.sku_code,
      price: input.productVariant.price ?? null,
      quantity: input.productVariant.quantity,
      created_at: toISOStringSafe(input.productVariant.created_at),
      optionValues: input.productVariant.optionValues.map((ov) => {
        const variant: IEcommerceMallProductVariant.ISummary = {
          id: ov.productVariant.id,
          sku_code: ov.productVariant.sku_code,
          price: ov.productVariant.price ?? null,
          quantity: ov.productVariant.quantity,
          created_at: toISOStringSafe(ov.productVariant.created_at),
          optionValues: [],
        } satisfies IEcommerceMallProductVariant.ISummary;
        return {
          id: ov.id,
          key: ov.key,
          value: ov.value,
          variant,
          created_at: toISOStringSafe(ov.created_at),
          updated_at: toISOStringSafe(ov.updated_at),
        } satisfies IEcommerceMallProductVariantOptionValue;
      }),
    };
    const cart: IEcommerceMallCart = {
      id: input.cart.id,
      created_at: toISOStringSafe(input.cart.created_at),
      updated_at: toISOStringSafe(input.cart.updated_at),
      customer: {
        id: input.cart.customer.id,
        email: input.cart.customer.email,
        created_at: input.cart.customer.created_at.toISOString(),
        display_name: input.cart.customer.profile?.display_name ?? null,
        status: input.cart.customer.deleted_at ? "deleted" : "active",
      },
      cart_items: [],
    };
    return {
      id: input.id,
      quantity: input.quantity,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      cart,
      product_variant,
      subtotal: input.quantity * (product_variant.price ?? 0),
      availability_warning:
        input.productVariant.quantity < input.quantity
          ? "Stock insufficient for requested quantity"
          : null,
    };
  }
}
