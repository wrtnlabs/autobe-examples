import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCancellationRequestCollector } from "../collectors/EcommerceMallCancellationRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Validate order item exists and retrieve necessary fields
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        seller_id: true,
        status: true,
      },
    });
  // Verify order item belongs to an order placed by the authenticated customer
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: orderItem.ecommerce_mall_order_id,
      ecommerce_mall_member_id: props.member.id,
    },
  });
  // Check order item status is 'paid'
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item must be in paid status to request cancellation",
      400,
    );
  }
  // Check no active cancellation request exists for this order item
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.body.order_item_id,
        status: { in: ["pending", "approved", "rejected"] },
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "An active cancellation request already exists for this order item",
      409,
    );
  }
  // Create the cancellation request
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: await EcommerceMallCancellationRequestCollector.collect({
        body: props.body,
      }),
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  return await EcommerceMallCancellationRequestTransformer.transform(record);
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberCancellationRequests(props: {
//   member: MemberPayload;
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