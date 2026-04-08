import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdItemsItemIdRefundReject(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  // Execute update and snapshot creation in a transaction for atomicity
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find the refund request for the order item with pending status
    const record = await tx.shopping_mall_refund_requests.findFirstOrThrow({
      ...ShoppingMallRefundRequestTransformer.select(),
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: "pending",
        deleted_at: null,
      },
    });
    // Verify the seller owns the order item
    const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, shopping_mall_seller_id: true },
    });
    if (orderItem.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Update the refund request to rejected status
    const updated = await tx.shopping_mall_refund_requests.update({
      where: { id: record.id },
      data: {
        status: "rejected",
        responded_at: new Date(),
        updated_at: new Date(),
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_seller_session_id: props.seller.session_id,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
    // Create a snapshot of the rejection
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_refund_request_id: record.id,
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_customer_session_id: record.customerSession.id,
        status_before: "pending",
        status_after: "rejected",
        response_text: null,
        created_at: new Date(),
      },
    });
    return updated;
  });
  return await ShoppingMallRefundRequestTransformer.transform(result);
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
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerOrdersOrderIdItemsItemIdRefundReject(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallRefundRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
//     ...ShoppingMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------