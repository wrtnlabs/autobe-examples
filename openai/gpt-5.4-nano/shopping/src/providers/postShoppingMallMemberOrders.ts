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
  const payment =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_payment_id },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        orderForPayment: {
          select: {
            id: true,
            shopping_customer_id: true,
          },
        },
      },
    });
  if (payment.deleted_at !== null) {
    throw new HttpException("Payment not found", 404);
  }
  const paymentOrder = payment.orderForPayment;
  if (
    paymentOrder === null ||
    paymentOrder.shopping_customer_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (payment.status !== "succeeded") {
    throw new HttpException("Payment not successful", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const orderCreate = await ShoppingMallOrderCollector.collect({
      body: props.body,
      customer: props.member,
    });
    const createdOrder = await tx.shopping_mall_orders.create({
      data: orderCreate,
      select: {
        id: true,
      },
    });
    const full = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: createdOrder.id },
      ...ShoppingMallOrderTransformer.select(),
    });
    return full;
  });
  return await ShoppingMallOrderTransformer.transform(created);
}
