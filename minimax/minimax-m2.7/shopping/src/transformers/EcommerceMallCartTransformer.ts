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
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartTransformer {
  export type Payload = Prisma.ecommerce_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        cartItems: {
          select: {
            id: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            productVariant:
              EcommerceMallProductVariantAtSummaryTransformer.select(),
            cart: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                customer: EcommerceMallCustomerAtSummaryTransformer.select(),
                cartItems: {
                  select: {
                    id: true,
                    quantity: true,
                    created_at: true,
                    updated_at: true,
                    productVariant:
                      EcommerceMallProductVariantAtSummaryTransformer.select(),
                  },
                } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_cartsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cartsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceMallCart> {
    const customer = await EcommerceMallCustomerAtSummaryTransformer.transform(
      input.customer,
    );
    const cart_items = await ArrayUtil.asyncMap(
      input.cartItems,
      async (item) => {
        const product_variant =
          await EcommerceMallProductVariantAtSummaryTransformer.transform(
            item.productVariant,
          );
        const cart_customer =
          await EcommerceMallCustomerAtSummaryTransformer.transform(
            item.cart.customer,
          );
        const cart_cart_items = await ArrayUtil.asyncMap(
          item.cart.cartItems,
          async (ci) => {
            const ci_product_variant =
              await EcommerceMallProductVariantAtSummaryTransformer.transform(
                ci.productVariant,
              );
            return {
              id: ci.id,
              quantity: ci.quantity,
              created_at: toISOStringSafe(ci.created_at),
              updated_at: toISOStringSafe(ci.updated_at),
              cart: {
                id: item.cart.id,
                created_at: toISOStringSafe(item.cart.created_at),
                updated_at: toISOStringSafe(item.cart.updated_at),
                customer: cart_customer,
                cart_items: [],
              },
              product_variant: ci_product_variant,
              subtotal: ci.quantity * (ci_product_variant.price ?? 0),
              availability_warning:
                ci.productVariant.quantity < ci.quantity
                  ? "Stock insufficient for requested quantity"
                  : null,
            } satisfies IEcommerceMallCartItem;
          },
        );
        return {
          id: item.id,
          quantity: item.quantity,
          created_at: toISOStringSafe(item.created_at),
          updated_at: toISOStringSafe(item.updated_at),
          cart: {
            id: item.cart.id,
            created_at: toISOStringSafe(item.cart.created_at),
            updated_at: toISOStringSafe(item.cart.updated_at),
            customer: cart_customer,
            cart_items: cart_cart_items,
          },
          product_variant,
          subtotal: item.quantity * (product_variant.price ?? 0),
          availability_warning:
            item.productVariant.quantity < item.quantity
              ? "Stock insufficient for requested quantity"
              : null,
        } satisfies IEcommerceMallCartItem;
      },
    );
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      customer,
      cart_items,
    };
  }
}
