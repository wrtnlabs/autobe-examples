import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
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
import { ECommerceMallCancellationRequestCollector } from "../collectors/ECommerceMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCancellationRequestTransformer } from "../transformers/ECommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IECommerceMallCancellationRequest.ICreate;
}): Promise<IECommerceMallCancellationRequest> {
  // 1. Find the order item with its parent order (404 if not found via findUniqueOrThrow)
  const orderItem =
    await MyGlobal.prisma.e_commerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        status: true,
        e_commerce_mall_order_id: true,
        order: {
          select: {
            e_commerce_mall_customer_id: true,
          },
        },
      },
    });
  // 2. Verify the order item belongs to the authenticated customer
  if (orderItem.order.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify the order item is in paid status
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "The order item is not eligible for cancellation. Only items in paid status can be cancelled.",
      422,
    );
  }
  // 4. Check no existing pending cancellation request for this order item
  const existingPending =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findFirst({
      where: {
        e_commerce_mall_order_item_id: props.body.order_item_id,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item.",
      409,
    );
  }
  // 5. Create the cancellation request using the Collector and Transformer
  const record =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.create({
      data: await ECommerceMallCancellationRequestCollector.collect({
        body: props.body,
        customer: { id: props.customer.id },
        customerSession: { id: props.customer.session_id },
      }),
      ...ECommerceMallCancellationRequestTransformer.select(),
    });
  return await ECommerceMallCancellationRequestTransformer.transform(record);
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
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerCancellationRequests(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCancellationRequest.ICreate;
// }): Promise<IECommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.e_commerce_mall_cancellation_requests.create({
//     data: await ECommerceMallCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallCancellationRequestTransformer.select(),
//   });
//   return await ECommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------