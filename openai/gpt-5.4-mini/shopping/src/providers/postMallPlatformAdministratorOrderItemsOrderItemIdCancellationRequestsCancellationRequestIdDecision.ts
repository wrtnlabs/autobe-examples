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

export async function postMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdDecision(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.IDecision;
}): Promise<IMallPlatformCancellationRequest> {
  if (props.body.decision !== true && props.body.decision !== false) {
    throw new HttpException("Bad Request", 400);
  }
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current =
      await prisma.mall_platform_cancellation_requests.findFirstOrThrow({
        where: {
          id: props.cancellationRequestId,
          mall_platform_order_item_id: props.orderItemId,
        },
        ...MallPlatformCancellationRequestTransformer.select(),
      });
    if (current.status !== "pending") {
      throw new HttpException("Conflict", 409);
    }
    await prisma.mall_platform_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        status: props.body.decision ? "approved" : "rejected",
        reviewer_id: props.administrator.id,
        review_result: props.body.decision ? "approved" : "rejected",
        reviewer_note: props.body.reviewerNote ?? null,
      },
    });
    return await prisma.mall_platform_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        mall_platform_order_item_id: props.orderItemId,
      },
      ...MallPlatformCancellationRequestTransformer.select(),
    });
  });
  return await MallPlatformCancellationRequestTransformer.transform(record);
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
// export async function postMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdDecision(props: {
//   administrator: AdministratorPayload;
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