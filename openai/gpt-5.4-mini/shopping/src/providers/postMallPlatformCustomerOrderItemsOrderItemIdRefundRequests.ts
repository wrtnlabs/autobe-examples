import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformRefundRequestCollector } from "../collectors/MallPlatformRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformRefundRequestTransformer } from "../transformers/MallPlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerOrderItemsOrderItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequest.ICreate;
}): Promise<IMallPlatformRefundRequest> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
        status: true,
      },
    });
    const order = await prisma.mall_platform_orders.findUniqueOrThrow({
      where: { id: orderItem.mall_platform_order_id },
      select: {
        customer_id: true,
      },
    });
    if (order.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (orderItem.status !== "delivered") {
      throw new HttpException("Forbidden", 403);
    }
    const existing = await prisma.mall_platform_refund_requests.findUnique({
      where: { mall_platform_order_item_id: props.orderItemId },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Conflict", 409);
    }
    await prisma.mall_platform_refund_requests.create({
      data: await MallPlatformRefundRequestCollector.collect({
        body: props.body,
        orderItem: {
          id: orderItem.id,
        } satisfies IEntity,
        customer: {
          id: props.customer.id,
        } satisfies IEntity,
        seller: {
          id: orderItem.mall_platform_seller_id,
        } satisfies IEntity,
      }),
    });
    const created =
      await prisma.mall_platform_refund_requests.findUniqueOrThrow({
        where: { mall_platform_order_item_id: props.orderItemId },
        ...MallPlatformRefundRequestTransformer.select(),
      });
    return await MallPlatformRefundRequestTransformer.transform(created);
  });
}
