import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdItemsItemIdCancellationApprove(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IApprove;
}): Promise<IShoppingMallCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
      ...ShoppingMallCancellationRequestTransformer.select(),
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
    });
  if (request.orderItem.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (request.status !== "pending") {
    throw new HttpException("Cancellation request is not pending", 409);
  }
  if (request.orderItem.status !== "paid") {
    throw new HttpException("Order item is not in paid status", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: request.id },
      data: {
        status: "approved",
        response_reason: props.body.response_reason ?? null,
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id: request.orderItem.productVariant.id,
        quantity_change: request.orderItem.quantity,
        reason: "cancellation_approved",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_cancellation_request_id: request.id,
        shopping_mall_seller_id: props.seller.id,
        status_before: "pending",
        status_after: "approved",
        seller_response: props.body.response_reason ?? null,
        created_at: new Date(),
      },
    });
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const allCancelled = allItems.every((item) => item.status === "cancelled");
    if (allCancelled) {
      await tx.shopping_mall_orders.update({
        where: { id: props.orderId },
        data: {
          updated_at: new Date(),
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        ...ShoppingMallCancellationRequestTransformer.select(),
        where: { id: request.id },
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
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
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerOrdersOrderIdItemsItemIdCancellationApprove(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequest.IApprove;
// }): Promise<IShoppingMallCancellationRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
//     ...ShoppingMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------