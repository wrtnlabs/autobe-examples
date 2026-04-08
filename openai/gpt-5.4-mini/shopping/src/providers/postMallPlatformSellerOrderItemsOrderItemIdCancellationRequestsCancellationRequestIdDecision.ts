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

export async function postMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdDecision(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IDecision;
}): Promise<IMallPlatformCancellationRequest> {
  const request =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
        deleted_at: null,
      },
      ...MallPlatformCancellationRequestTransformer.select(),
    });
  const orderItem = request.orderItem;
  if (orderItem.seller.id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  if (request.status !== "pending") throw new HttpException("Conflict", 409);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        reviewer_id: props.seller.id,
        status: props.body.decision ? "approved" : "rejected",
        review_result: props.body.decision ? "approved" : "rejected",
        reviewer_note: props.body.reviewerNote ?? null,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
        deleted_at: null,
      },
      ...MallPlatformCancellationRequestTransformer.select(),
    });
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
// export async function postMallPlatformSellerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdDecision(props: {
//   seller: SellerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformCancellationRequest.IDecision;
// }): Promise<IMallPlatformCancellationRequest> {
//   const record = await MyGlobal.prisma.mall_platform_cancellation_requests.findFirstOrThrow({
//     ...MallPlatformCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------