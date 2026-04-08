import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallRefundRequestCollector } from "../collectors/EcommerceMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Fetch order item to get order_id
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        status: true,
        ecommerce_mall_order_id: true,
      },
    },
  );
  // Validate order item exists
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Validate order item is in 'delivered' status
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // Fetch order with customer and order items info
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
      deleted_at: true,
      orderItems: {
        select: {
          ecommerce_mall_seller_profile_snapshot_id: true,
        },
      },
    },
  });
  // Validate order exists
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Validate customer owns the order
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to request a refund for this order",
      403,
    );
  }
  // Fetch seller profile to get seller id
  const sellerSnapshot =
    order.orderItems[0]?.ecommerce_mall_seller_profile_snapshot_id;
  let sellerId: string | null = null;
  if (sellerSnapshot) {
    const sellerProfile =
      await MyGlobal.prisma.ecommerce_mall_seller_profiles.findUnique({
        where: { id: sellerSnapshot },
        select: { seller_id: true },
      });
    sellerId = sellerProfile?.seller_id ?? null;
  }
  // Validate seller matches
  if (sellerId !== null && sellerId !== props.body.sellerId) {
    throw new HttpException("Seller does not match the order item", 400);
  }
  // Check for existing refund request for this order item
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.body.orderItemId,
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A refund request already exists for this order item",
      400,
    );
  }
  // Create the refund request using collector
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: await EcommerceMallRefundRequestCollector.collect({
      body: props.body,
      ecommerceMallCustomers: props.customer as unknown as IEntity,
    }),
    select: {
      id: true,
      reason: true,
      status: true,
      seller_response_at: true,
      created_at: true,
      updated_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          profile: {
            select: {
              id: true,
              display_name: true,
              phone: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          created_at: true,
          profile: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_uri: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  // Get customer profile safely
  const customerProfile = created.customer.profile;
  // Transform to response DTO
  return {
    id: created.id as string & tags.Format<"uuid">,
    snapshotReason: created.reason,
    snapshotStatus: created.status,
    sellerResponse: "",
    sellerResponseReason: null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    customer: {
      id: created.customer.id as string & tags.Format<"uuid">,
      email: created.customer.email as string & tags.Format<"email">,
      createdAt: toISOStringSafe(created.customer.created_at),
      updatedAt: toISOStringSafe(created.customer.updated_at),
      deletedAt:
        created.customer.deleted_at != null
          ? toISOStringSafe(created.customer.deleted_at)
          : null,
      customerProfile: {
        id: customerProfile!.id as string & tags.Format<"uuid">,
        profileType: "customer" as const,
        customerId: created.customer.id as string & tags.Format<"uuid">,
        sellerId: undefined,
        displayName: customerProfile!.display_name ?? undefined,
        phone: customerProfile!.phone ?? null,
        name: undefined,
        description: undefined,
        logoUri: undefined,
        createdAt: toISOStringSafe(customerProfile!.created_at),
        updatedAt: toISOStringSafe(customerProfile!.updated_at),
      } satisfies IEcommerceMallCustomerProfile,
    } satisfies IEcommerceMallCustomer.ISummary,
    seller: {
      id: created.seller.id as string & tags.Format<"uuid">,
      email: created.seller.email,
      approvalStatus: created.seller.approval_status,
      createdAt: toISOStringSafe(created.seller.created_at),
    } satisfies IEcommerceMallSeller.ISummary,
  } satisfies IEcommerceMallRefundRequest;
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerRefundRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallRefundRequest.ICreate;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
//     data: await EcommerceMallRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallRefundRequestTransformer.select(),
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------