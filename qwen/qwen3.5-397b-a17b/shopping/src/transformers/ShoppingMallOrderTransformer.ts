import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";
import { ShoppingMallOrderItemTransformer } from "./ShoppingMallOrderItemTransformer";
import { ShoppingMallReviewAtSummaryTransformer } from "./ShoppingMallReviewAtSummaryTransformer";
import { ShoppingMallShipmentTransformer } from "./ShoppingMallShipmentTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        total_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: ShoppingMallMemberAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemTransformer.select(),
        shipments: ShoppingMallShipmentTransformer.select(),
        reviews: ShoppingMallReviewAtSummaryTransformer.select(),
      },
    };
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      code: input.code,
      total_price: input.total_price,
      customer: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        ShoppingMallShipmentTransformer.transform,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IShoppingMallOrder;
  }
}
