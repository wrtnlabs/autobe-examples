import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallRefundRequestCollector } from "../collectors/ECommerceMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallRefundRequestTransformer } from "../transformers/ECommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IECommerceMallRefundRequest.ICreate;
}): Promise<IECommerceMallRefundRequest> {
  // 1. Verify the order item exists and belongs to the authenticated customer
  const orderItem = await MyGlobal.prisma.e_commerce_mall_order_items.findFirst(
    {
      where: {
        id: props.body.orderItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        updated_at: true,
        e_commerce_mall_order_id: true,
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.e_commerce_mall_order_id !== props.customer.id) {
    throw new HttpException("The order item does not belong to you", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Only delivered items can be refunded", 400);
  }
  // 2. Verify the 7-day refund window from delivery date
  const deliveryLog =
    await MyGlobal.prisma.e_commerce_mall_order_item_status_logs.findFirst({
      where: {
        e_commerce_mall_order_item_id: props.body.orderItemId,
        to_status: "delivered",
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });
  const deliveryTimestamp = deliveryLog?.created_at ?? orderItem.updated_at;
  const now = new Date();
  const diffMs = now.getTime() - deliveryTimestamp.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 7) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  // 3. Verify no duplicate pending refund request for this order item
  const existingRequest =
    await MyGlobal.prisma.e_commerce_mall_refund_requests.findFirst({
      where: {
        e_commerce_mall_order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending refund request already exists for this order item",
      400,
    );
  }
  // 4. Create the refund request using collector + transformer
  const record = await MyGlobal.prisma.e_commerce_mall_refund_requests.create({
    data: await ECommerceMallRefundRequestCollector.collect({
      body: props.body,
      eCommerceMallCustomers: { id: props.customer.id },
      eCommerceMallCustomerSessions: {
        id: props.customer.session_id,
      },
    }),
    ...ECommerceMallRefundRequestTransformer.select(),
  });
  return await ECommerceMallRefundRequestTransformer.transform(record);
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
// import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerRefundRequests(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallRefundRequest.ICreate;
// }): Promise<IECommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.e_commerce_mall_refund_requests.create({
//     data: await ECommerceMallRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallRefundRequestTransformer.select(),
//   });
//   return await ECommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------