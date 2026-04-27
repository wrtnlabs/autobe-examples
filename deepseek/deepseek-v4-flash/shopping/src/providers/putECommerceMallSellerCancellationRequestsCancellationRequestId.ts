import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallCancellationRequestTransformer } from "../transformers/ECommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putECommerceMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallCancellationRequest.IUpdate;
}): Promise<IECommerceMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          reason: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              productVariant: {
                select: {
                  id: true,
                  product: {
                    select: {
                      seller_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Only pending cancellation requests can be responded to",
      400,
    );
  }
  if (
    cancellationRequest.orderItem.productVariant.product.seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const newStatus = props.body.status;
  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new HttpException(
      "Status must be either 'approved' or 'rejected'",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.e_commerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        e_commerce_mall_seller_id: props.seller.id,
        e_commerce_mall_seller_session_id: props.seller.session_id,
        status: newStatus,
        responded_at: now,
        ...(newStatus === "rejected" &&
        props.body.rejection_reason !== undefined
          ? { rejection_reason: props.body.rejection_reason }
          : {}),
        updated_at: now,
      },
    });
    await tx.e_commerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        e_commerce_mall_cancellation_request_id: props.cancellationRequestId,
        reason: cancellationRequest.reason,
        status: newStatus,
        created_at: now,
      },
    });
    if (newStatus === "approved") {
      await tx.e_commerce_mall_order_items.update({
        where: { id: cancellationRequest.orderItem.id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      await tx.e_commerce_mall_inventory_records.create({
        data: {
          id: v4(),
          e_commerce_mall_product_variant_id:
            cancellationRequest.orderItem.productVariant.id,
          quantity_change: cancellationRequest.orderItem.quantity,
          reason: "cancellation_approval",
          created_at: now,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ECommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await ECommerceMallCancellationRequestTransformer.transform(updated);
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
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSellerCancellationRequestsCancellationRequestId(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IECommerceMallCancellationRequest.IUpdate;
// }): Promise<IECommerceMallCancellationRequest> {
//   await MyGlobal.prisma.e_commerce_mall_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallCancellationRequestTransformer.select(),
//   });
//   return await ECommerceMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------