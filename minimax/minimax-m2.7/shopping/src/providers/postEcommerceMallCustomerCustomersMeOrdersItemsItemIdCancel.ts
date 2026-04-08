import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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

export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdCancel(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Query order item with required relations to validate ownership
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        status: true,
        ecommerce_mall_order_id: true,
        product: {
          select: {
            id: true,
            seller: {
              select: {
                id: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  // Verify order item belongs to authenticated customer
  if (orderItem.order.customer.id !== props.customer.id) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item status is 'paid'
  if (orderItem.status !== "paid") {
    throw new HttpException("Item is not eligible for cancellation", 400);
  }
  // Check if cancellation request already exists for this item
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { ecommerce_mall_order_item_id: props.itemId },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Cancellation request already submitted for this item",
      400,
    );
  }
  // Create cancellation request
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reason: props.body.reason,
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
        orderItem: { connect: { id: props.itemId } },
        customer: { connect: { id: props.customer.id } },
        seller: { connect: { id: orderItem.product.seller.id } },
      },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
        orderItem: {
          select: {
            id: true,
          },
        },
        snapshots: true,
      },
    });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdCancel(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
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