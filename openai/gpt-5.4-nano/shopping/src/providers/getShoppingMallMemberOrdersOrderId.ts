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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberOrdersOrderId(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      shopping_customer_id: props.member.id,
      deleted_at: null,
    },
    select: {
      ...ShoppingMallOrderTransformer.select().select,
      orderItems: {
        ...ShoppingMallOrderTransformer.select().select.orderItems,
        where: {
          deleted_at: null,
        },
      },
      shipments: {
        ...ShoppingMallOrderTransformer.select().select.shipments,
        where: {
          deleted_at: null,
        },
      },
      payment: {
        ...ShoppingMallOrderTransformer.select().select.payment,
      },
      customer: {
        ...ShoppingMallOrderTransformer.select().select.customer,
      },
    },
  });
  return await ShoppingMallOrderTransformer.transform(order);
}
