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
        status: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
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
    if (orderItem.status === "cancelled") {
      throw new HttpException(
        "Refund requests are not allowed for cancelled order items",
        400,
      );
    }
    if (orderItem.status === "refunded") {
      throw new HttpException(
        "Refund requests are not allowed for refunded order items",
        400,
      );
    }
    if (orderItem.status !== "delivered") {
      throw new HttpException(
        "Refund requests are only allowed for delivered order items",
        400,
      );
    }
    const existing = await prisma.mall_platform_refund_requests.findUnique({
      where: { mall_platform_order_item_id: props.orderItemId },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException(
        "Refund request already exists for this order item",
        400,
      );
    }
    const created = await prisma.mall_platform_refund_requests.create({
      data: await MallPlatformRefundRequestCollector.collect({
        body: props.body,
        orderItem: { id: orderItem.id },
        customer: { id: props.customer.id },
        seller: { id: orderItem.mall_platform_seller_id },
      }),
      ...MallPlatformRefundRequestTransformer.select(),
    });
    return await MallPlatformRefundRequestTransformer.transform(created);
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerOrderItemsOrderItemIdRefundRequests(props: {
//   customer: CustomerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformRefundRequest.ICreate;
// }): Promise<IMallPlatformRefundRequest> {
//   const record = await MyGlobal.prisma.mall_platform_refund_requests.create({
//     data: await MallPlatformRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformRefundRequestTransformer.select(),
//   });
//   return await MallPlatformRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------