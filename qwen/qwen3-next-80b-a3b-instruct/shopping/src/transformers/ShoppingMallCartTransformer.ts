import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCartItemTransformer } from "./ShoppingMallCartItemTransformer";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallCartTransformer {
  export type Payload = Prisma.shopping_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true, // Replaced status with deleted_at from schema members
        // Reuse neighbor transformer for items
        shopping_mall_cart_items: ShoppingMallCartItemTransformer.select(),
        // Reuse neighbor transformer for customer
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        // Include other relations for internal tracking but not in DTO
        shopping_mall_cart_sessions: true,
        shopping_mall_payment_intents: true,
      },
    } satisfies Prisma.shopping_mall_cartsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallCart> {
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      status: input.deleted_at === null ? "active" : "expired", // Computed from deleted_at since the field is not selectable per validation
      items: await ArrayUtil.asyncMap(input.shopping_mall_cart_items, (item) =>
        ShoppingMallCartItemTransformer.transform(item),
      ),
      totalItems: input.shopping_mall_cart_items.length,
      totalQuantity: input.shopping_mall_cart_items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      totalPrice: input.shopping_mall_cart_items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity, // Fixed: use 'price' from ShoppingMallCartItemTransformer
        0,
      ),
      customer: typia.assert<IShoppingMallCustomer.ISummary>(
        await ShoppingMallCustomerAtSummaryTransformer.transform(
          input.customer,
        ),
      ), // Removed conditional - DTO requires non-nullable IShoppingMallCustomer.ISummary
    };
  }
}
