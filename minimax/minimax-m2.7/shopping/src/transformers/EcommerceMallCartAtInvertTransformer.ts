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

export namespace EcommerceMallCartAtInvertTransformer {
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
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                price: true,
                quantity: true,
                created_at: true,
                product: {
                  select: {
                    id: true,
                    base_price: true,
                  },
                },
                optionValues: {
                  select: {
                    id: true,
                    key: true,
                    value: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCart.IInvert> {
    let total = 0;
    const items: IEcommerceMallCartItem[] = input.cartItems.map((item) => {
      const effectivePrice =
        item.productVariant.price ?? item.productVariant.product.base_price;
      const subtotal = item.quantity * effectivePrice;
      total += subtotal;
      const availability_warning =
        item.productVariant.quantity < item.quantity
          ? "Stock insufficient for requested quantity"
          : undefined;
      return {
        id: item.id,
        quantity: item.quantity,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        product_variant: {
          id: item.productVariant.id,
          sku_code: item.productVariant.sku_code,
          price: item.productVariant.price,
          quantity: item.productVariant.quantity,
          created_at: toISOStringSafe(item.productVariant.created_at),
          optionValues: item.productVariant.optionValues.map((ov) => ({
            id: ov.id,
            key: ov.key,
            value: ov.value,
            created_at: toISOStringSafe(ov.created_at),
            updated_at: toISOStringSafe(ov.updated_at),
            variant:
              undefined as unknown as IEcommerceMallProductVariantOptionValue["variant"],
          })),
        },
        subtotal,
        availability_warning,
        cart: input as unknown as IEcommerceMallCart,
      } satisfies IEcommerceMallCartItem;
    });
    return {
      id: input.id,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      total,
      items,
    } satisfies IEcommerceMallCart.IInvert;
  }
}
