import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdRefund(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // 1. Query order item to verify it exists and belongs to customer
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        order: {
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        status: true,
        updated_at: true,
        ecommerce_mall_product_snapshot_id: true,
      },
    });
  // 2. Validate item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // 3. Get product snapshot to find seller ID
  const productSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: orderItem.ecommerce_mall_product_snapshot_id,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // 4. Validate delivery date within 7 days
  const nowISO = toISOStringSafe(new Date());
  const deliveryDateISO = toISOStringSafe(new Date(orderItem.updated_at));
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const daysSinceDelivery =
    new Date(nowISO).getTime() - new Date(deliveryDateISO).getTime();
  if (daysSinceDelivery > sevenDaysInMs) {
    throw new HttpException(
      "Refund window has expired. You have 7 days from delivery to request a refund.",
      400,
    );
  }
  // 5. Check no existing refund request exists for this item
  const existingRefund =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.itemId,
        status: {
          in: ["pending", "approved"],
        },
        deleted_at: null,
      },
    });
  if (existingRefund) {
    throw new HttpException(
      "A refund request already exists for this item",
      409,
    );
  }
  // 6. Create refund request with pending status
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: {
      id: v4(),
      ecommerce_mall_order_item_id: props.itemId,
      ecommerce_mall_customer_id: props.customer.id,
      ecommerce_mall_seller_id: productSnapshot.ecommerce_mall_seller_id,
      reason: props.body.reason,
      status: "pending",
      seller_response_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  // 7. Return transformed response
  return await EcommerceMallRefundRequestTransformer.transform(created);
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrdersItemsItemIdRefund(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
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