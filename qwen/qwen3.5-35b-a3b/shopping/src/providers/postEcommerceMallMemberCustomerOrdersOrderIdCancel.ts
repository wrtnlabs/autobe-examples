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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallOrderAtCancelResponseTransformer } from "../transformers/EcommerceMallOrderAtCancelResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberCustomerOrdersOrderIdCancel(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.ICancelRequest;
}): Promise<IEcommerceMallOrder.ICancelResponse[]> {
  // Step 1: Verify order exists and belongs to the authenticated member
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      ecommerce_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_member_id: true,
    },
  });
  // Step 2: Fetch all order items for this order
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      ecommerce_mall_order_id: true,
    },
  });
  // Step 3: Determine which items to cancel
  const itemIdsToCancel: string[] =
    props.body.itemIds ?? orderItems.map((item) => item.id);
  // Step 4: Create cancellation requests for each eligible item
  const createdRequests: string[] = await ArrayUtil.asyncMap(
    itemIdsToCancel,
    async (itemId: string) => {
      // Find the item in our loaded order items
      const item = orderItems.find((i) => i.id === itemId);
      if (!item) {
        throw new HttpException(`Order item not found: ${itemId}`, 404);
      }
      // Validate item status is 'paid' (only paid items can be cancelled)
      if (item.status !== "paid") {
        throw new HttpException(
          `Order item ${itemId} cannot be cancelled: status is '${item.status}', only 'paid' items can be cancelled`,
          400,
        );
      }
      // Check for existing pending cancellation request (enforced by unique constraint)
      const existingRequest =
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
          where: {
            ecommerce_mall_order_item_id: itemId,
            status: "pending",
            deleted_at: null,
          },
        });
      if (existingRequest) {
        throw new HttpException(
          `Order item ${itemId} already has a pending cancellation request`,
          400,
        );
      }
      // Create the cancellation request
      const cancellationRequest =
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
          data: {
            id: v4(),
            reason: props.body.reason,
            status: "pending",
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
            item: { connect: { id: itemId } },
            order: { connect: { id: props.orderId } },
            seller: { connect: { id: order.ecommerce_mall_member_id } },
          },
        });
      // Create snapshot for the cancellation request
      await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create(
        {
          data: {
            id: v4(),
            cancellation_request_id: cancellationRequest.id,
            title: "",
            body: "",
            actor_type: "SYSTEM" as const,
            created_by: props.member.id,
            created_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        },
      );
      return cancellationRequest.id;
    },
  );
  // Step 5: Transform and return the created cancellation requests with full details
  const results = await ArrayUtil.asyncMap(
    createdRequests,
    async (requestId: string) => {
      const fullRequest =
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
          {
            where: { id: requestId },
            ...EcommerceMallOrderAtCancelResponseTransformer.select(),
          },
        );
      return await EcommerceMallOrderAtCancelResponseTransformer.transform(
        fullRequest,
      );
    },
  );
  return results;
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberCustomerOrdersOrderIdCancel(props: {
//   member: MemberPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IEcommerceMallOrder.ICancelRequest;
// }): Promise<IEcommerceMallOrder.ICancelResponse> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
//     ...EcommerceMallOrderAtCancelResponseTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderAtCancelResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------