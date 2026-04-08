import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Step 1: Validate order item exists and belongs to the customer
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        status: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Verify ownership - must belong to authenticated customer
  if (orderItem.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order item not found", 404);
  }
  // Step 2: Verify order item status is 'paid' (not yet shipped)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item cannot be cancelled. Only paid items that haven't been shipped can be cancelled.",
      422,
    );
  }
  // Step 3: Check for existing pending cancellation request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item",
      409,
    );
  }
  // Step 4: Create the cancellation request
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: {
        id: v4(),
        ecommerce_mall_order_item_id: props.body.orderItemId,
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_seller_id: orderItem.ecommerce_mall_seller_id,
        reason: props.body.reason,
        status: "pending",
        response_reason: null,
        responded_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  // Step 5: Return transformed result
  return await EcommerceMallCancellationRequestTransformer.transform(created);
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCancellationRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCancellationRequest.ICreate;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
//     data: await EcommerceMallCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCancellationRequestTransformer.select(),
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------