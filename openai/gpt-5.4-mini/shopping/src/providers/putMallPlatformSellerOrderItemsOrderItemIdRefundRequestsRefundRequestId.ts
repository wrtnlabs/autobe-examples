import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
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
import { MallPlatformRefundRequestTransformer } from "../transformers/MallPlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequest.IUpdate;
}): Promise<IMallPlatformRefundRequest> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const refundRequest =
      await prisma.mall_platform_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
          mall_platform_seller_id: true,
          status: true,
        },
      });
    if (refundRequest.mall_platform_order_item_id !== props.orderItemId) {
      throw new HttpException("Not Found", 404);
    }
    if (refundRequest.mall_platform_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const orderItem = await prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
      },
    });
    if (orderItem.status !== "delivered") {
      throw new HttpException("Refund request is not eligible", 400);
    }
    if (
      refundRequest.status !== "pending" &&
      refundRequest.status !== "requested"
    ) {
      throw new HttpException("Refund request is not eligible", 400);
    }
    await prisma.mall_platform_refund_requests.update({
      where: {
        id: props.refundRequestId,
        status: refundRequest.status,
      },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.reviewed_at !== undefined && {
          reviewed_at: props.body.reviewed_at,
        }),
        ...(props.body.review_note !== undefined && {
          review_note: props.body.review_note,
        }),
      },
    });
    const updated =
      await prisma.mall_platform_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        ...MallPlatformRefundRequestTransformer.select(),
      });
    return await MallPlatformRefundRequestTransformer.transform(updated);
  });
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
// import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
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
// export async function putMallPlatformSellerOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformRefundRequest.IUpdate;
// }): Promise<IMallPlatformRefundRequest> {
//   await MyGlobal.prisma.mall_platform_refund_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformRefundRequestTransformer.select(),
//   });
//   return await MallPlatformRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------