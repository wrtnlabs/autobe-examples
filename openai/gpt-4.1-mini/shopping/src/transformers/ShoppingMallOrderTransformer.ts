import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallOrderItemSnapshotAtSummaryTransformer } from "./ShoppingMallOrderItemSnapshotAtSummaryTransformer";
import { ShoppingMallOrderSnapshotAtSummaryTransformer } from "./ShoppingMallOrderSnapshotAtSummaryTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        total_quantity: true,
        order_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        orderItemSnapshots:
          ShoppingMallOrderItemSnapshotAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemAtSummaryTransformer.select(),
        orderSnapshots: ShoppingMallOrderSnapshotAtSummaryTransformer.select(),
        reviews: true,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      totalPrice: input.total_price,
      totalQuantity: input.total_quantity,
      orderStatus: input.order_status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItemSnapshots: await ArrayUtil.asyncMap(
        input.orderItemSnapshots,
        ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemAtSummaryTransformer.transform,
      ),
      orderSnapshots: await ArrayUtil.asyncMap(
        input.orderSnapshots,
        ShoppingMallOrderSnapshotAtSummaryTransformer.transform,
      ),
    };
  }
}
