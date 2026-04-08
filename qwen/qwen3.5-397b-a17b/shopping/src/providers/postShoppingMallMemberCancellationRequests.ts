import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { ShoppingMallCancellationRequestCollector } from "../collectors/ShoppingMallCancellationRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
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
      "Forbidden: This order item does not belong to your order",
      403,
    );
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      `Cannot cancel order item with status '${orderItem.status}'. Only items with 'paid' status can be cancelled.`,
      400,
    );
  }
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallMembers: { id: props.member.id },
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return await ShoppingMallCancellationRequestTransformer.transform(record);
}
