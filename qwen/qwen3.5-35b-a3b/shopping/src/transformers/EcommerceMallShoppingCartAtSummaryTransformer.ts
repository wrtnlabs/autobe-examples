import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCartItemAtSummaryTransformer } from "./EcommerceMallCartItemAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallShoppingCartAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shopping_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        customer: EcommerceMallSellerAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        cartItems: {
          select: {
            id: true,
            updated_at: true,
            deleted_at: true,
            quantity: true,
            price: true,
            created_at: true,
            variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
            cart: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                customer_id: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shopping_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShoppingCart.ISummary> {
    const cartItems = await ArrayUtil.asyncMap(
      input.cartItems,
      EcommerceMallCartItemAtSummaryTransformer.transform,
    );
    const itemCount = input.cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const subtotal = input.cartItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0,
    );
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    const sellerMap = new Map<
      string,
      {
        seller: any;
        quantity: number;
        subtotal: number;
      }
    >();
    for (const item of input.cartItems) {
      const sellerId = item.variant.product.seller.id;
      const existing = sellerMap.get(sellerId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.subtotal += item.quantity * Number(item.price);
      } else {
        sellerMap.set(sellerId, {
          seller: item.variant.product.seller,
          quantity: item.quantity,
          subtotal: item.quantity * Number(item.price),
        });
      }
    }
    const sellerSubtotalsPromises = Array.from(sellerMap.entries()).map(
      async ([sellerId, data]) => ({
        seller: await EcommerceMallSellerAtSummaryTransformer.transform(
          data.seller,
        ),
        itemCount: data.quantity,
        subtotal: data.subtotal,
        total: data.subtotal * 1.1,
      }),
    );
    const sellerSubtotals = (await Promise.all(sellerSubtotalsPromises)).filter(
      (s) => s !== undefined,
    );
    return {
      id: input.id,
      customerId: input.customer.id,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      itemCount,
      subtotal,
      tax,
      total,
      sellerSubtotals: sellerSubtotals.length > 0 ? sellerSubtotals : undefined,
      cartItems,
    };
  }
}
