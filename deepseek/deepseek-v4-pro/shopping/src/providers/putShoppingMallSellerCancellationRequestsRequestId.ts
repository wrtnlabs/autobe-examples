import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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

export async function putShoppingMallSellerCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          deleted_at: true,
          reason: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              status: true,
              productVariant: {
                select: {
                  id: true,
                  product: {
                    select: {
                      shopping_mall_seller_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  if (
    request.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (request.deleted_at !== null) {
    throw new HttpException("Cancellation request has been deleted", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Cancellation request is no longer pending", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        updated_at: new Date().toISOString(),
      },
    });
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        reason: request.reason,
        status: props.body.status,
        cancellationRequest: { connect: { id: props.requestId } },
        created_at: new Date().toISOString(),
      },
    });
    if (props.body.status === "approved") {
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          quantity_change: request.orderItem.quantity,
          reason: "Cancellation approved for request " + props.requestId,
          variant: { connect: { id: request.orderItem.productVariant.id } },
          created_at: new Date().toISOString(),
        },
      });
      await tx.shopping_mall_order_items.update({
        where: { id: request.orderItem.id },
        data: {
          status: "cancelled",
          updated_at: new Date().toISOString(),
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
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
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerCancellationRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequest.IUpdate;
// }): Promise<IShoppingMallCancellationRequest> {
//   await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCancellationRequestTransformer.select(),
//   });
//   return await ShoppingMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------