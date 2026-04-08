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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformRefundRequestTransformer } from "../transformers/MallPlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequest.IUpdate;
}): Promise<IMallPlatformRefundRequest> {
  const target =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
      },
      select: {
        id: true,
        mall_platform_order_item_id: true,
      },
    });
  if (target.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.mall_platform_refund_requests.update({
    where: {
      id: props.refundRequestId,
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
      mall_platform_administrator_id: props.administrator.id,
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
      },
      ...MallPlatformRefundRequestTransformer.select(),
    });
  return await MallPlatformRefundRequestTransformer.transform(updated);
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
// export async function putMallPlatformAdministratorOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
//   administrator: AdministratorPayload;
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