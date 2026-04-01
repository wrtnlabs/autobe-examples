import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCancellationRequestCollector } from "../collectors/MallPlatformCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.ICreate;
}): Promise<IMallPlatformCancellationRequest> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        mall_platform_order_id: true,
      },
    });
    const order = await prisma.mall_platform_orders.findUniqueOrThrow({
      where: { id: orderItem.mall_platform_order_id },
      select: {
        id: true,
        customer_id: true,
      },
    });
    if (order.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (orderItem.status !== "paid") {
      throw new HttpException(
        "This order item is not eligible for cancellation.",
        400,
      );
    }
    const existed = await prisma.mall_platform_cancellation_requests.findUnique(
      {
        where: { mall_platform_order_item_id: props.orderItemId },
        select: { id: true },
      },
    );
    if (existed !== null) {
      throw new HttpException(
        "Cancellation request already exists for this order item.",
        400,
      );
    }
    const created = await prisma.mall_platform_cancellation_requests.create({
      data: await MallPlatformCancellationRequestCollector.collect({
        body: props.body,
        orderItem: { id: props.orderItemId },
      }),
      ...MallPlatformCancellationRequestTransformer.select(),
    });
    return await MallPlatformCancellationRequestTransformer.transform(created);
  });
}
