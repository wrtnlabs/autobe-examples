import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCancellationRequestCollector } from "../collectors/EcommerceMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Validate order item exists, belongs to customer, and has 'paid' status
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.body.orderItemId,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
      status: true,
      product: {
        select: {
          id: true,
          ecommerce_mall_seller_id: true,
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 400);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be requested for items that have not yet been shipped",
      400,
    );
  }
  // Check no existing pending cancellation for same order item
  const existingCancellation =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.body.orderItemId,
        status: "pending",
      },
      select: { id: true },
    });
  if (existingCancellation !== null) {
    throw new HttpException(
      "A pending cancellation request already exists for this order item",
      409,
    );
  }
  // Build data using collector
  const collectorData = await EcommerceMallCancellationRequestCollector.collect(
    {
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallCustomerSessions: { id: props.customer.session_id },
      ecommerceMallSellers: { id: orderItem.product.ecommerce_mall_seller_id },
    },
  );
  // Create cancellation request
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: collectorData,
    });
  // Construct ISummary for nested response (snapshot format)
  const createdAt = toISOStringSafe(created.created_at);
  const innerSummary = typia.assert<IEcommerceMallCancellationRequest.ISummary>(
    {
      id: created.id,
      reason: created.reason,
      status: created.status,
      createdAt: createdAt,
    },
  );
  const summary: IEcommerceMallCancellationRequest.ISummary = {
    id: created.id,
    reason: created.reason,
    status: created.status,
    createdAt: createdAt,
    cancellationRequest: innerSummary,
  };
  // Return in snapshot format (IEcommerceMallCancellationRequest)
  return typia.assert<IEcommerceMallCancellationRequest>({
    id: created.id,
    reason: created.reason,
    status: created.status,
    createdAt: createdAt,
    cancellationRequest: summary,
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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