import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderCollector } from "../collectors/ShoppingMallOrderCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberOrders(props: {
  member: MemberPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const paymentId = props.body.shopping_mall_payment_id;
  const payment =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        paid_at: true,
        deleted_at: true,
        orderForPayment: {
          select: { shopping_customer_id: true },
        },
      },
    });
  if (payment.deleted_at !== null) {
    throw new HttpException("Payment is deleted", 400);
  }
  const paymentBelongsToMember =
    payment.orderForPayment?.shopping_customer_id === props.member.id;
  if (!paymentBelongsToMember) {
    throw new HttpException("Forbidden", 403);
  }
  const paymentIsSuccessful =
    payment.paid_at !== null || payment.status === "succeeded";
  if (!paymentIsSuccessful) {
    throw new HttpException("Payment not successful", 400);
  }
  const createdOrder = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.shopping_mall_orders.create({
      data: await ShoppingMallOrderCollector.collect({
        body: props.body,
        customer: props.member,
        payment,
      }),
      ...ShoppingMallOrderTransformer.select(),
    });
    return created;
  });
  return await ShoppingMallOrderTransformer.transform(createdOrder);
}
