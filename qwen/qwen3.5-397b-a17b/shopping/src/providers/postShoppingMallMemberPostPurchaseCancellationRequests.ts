import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallPostPurchaseCancellationRequestCollector } from "../collectors/ShoppingMallPostPurchaseCancellationRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallPostPurchaseCancellationRequestTransformer } from "../transformers/ShoppingMallPostPurchaseCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberPostPurchaseCancellationRequests(props: {
  member: MemberPayload;
  body: IShoppingMallPostPurchaseCancellationRequest.ICreate;
}): Promise<IShoppingMallPostPurchaseCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_item_id },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      member_id: true,
    },
  });
  if (order.member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Order item does not belong to you",
      403,
    );
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      `Cannot cancel order item with status '${orderItem.status}'. Only 'paid' items can be cancelled.`,
      400,
    );
  }
  const record =
    await MyGlobal.prisma.shopping_mall_post_purchase_cancellation_requests.create(
      {
        data: await ShoppingMallPostPurchaseCancellationRequestCollector.collect(
          {
            body: props.body,
            member: { id: props.member.id },
          },
        ),
        ...ShoppingMallPostPurchaseCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallPostPurchaseCancellationRequestTransformer.transform(
    record,
  );
}
