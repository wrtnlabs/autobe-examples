import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const current =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        select: {
          id: true,
          mall_platform_order_item_id: true,
          status: true,
          orderItem: {
            select: {
              id: true,
              mall_platform_seller_id: true,
              status: true,
            },
          },
        },
      },
    );
  if (current.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order item",
      404,
    );
  }
  if (current.orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (current.status !== "pending") {
    throw new HttpException("Cancellation request is already resolved", 400);
  }
  if (current.orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation request is not available for this order item",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        status: props.body.decision === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString() as never,
        review_result: props.body.decision,
        reviewer_note: props.body.reviewerNote ?? null,
        reviewer_id: props.seller.id,
        updated_at: new Date().toISOString() as never,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        ...MallPlatformCancellationRequestTransformer.select(),
      },
    );
  return await MallPlatformCancellationRequestTransformer.transform(updated);
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
// import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformCancellationRequest.IUpdate;
// }): Promise<IMallPlatformCancellationRequest> {
//   await MyGlobal.prisma.mall_platform_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformCancellationRequestTransformer.select(),
//   });
//   return await MallPlatformCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------