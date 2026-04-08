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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IUpdate;
}): Promise<IMallPlatformCancellationRequest> {
  const current =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          mall_platform_order_item_id: true,
          status: true,
          reviewed_at: true,
          review_result: true,
          reviewer_note: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (current.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Cancellation request does not belong to the specified order item.",
      400,
    );
  }
  if (current.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been resolved.",
      400,
    );
  }
  const decision = props.body.decision === "approve" ? "approved" : "rejected";
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        reviewer_id: props.administrator.id,
        reviewed_at: current.reviewed_at,
        review_result: decision,
        reviewer_note: props.body.reviewerNote ?? null,
        status: decision,
        updated_at: current.updated_at,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
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
// export async function putMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestId(props: {
//   administrator: AdministratorPayload;
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