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
import { MallPlatformCancellationRequestCollector } from "../collectors/MallPlatformCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCancellationRequestTransformer } from "../transformers/MallPlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequest.ICreate;
}): Promise<IMallPlatformCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        mall_platform_order_id: true,
        status: true,
        deleted_at: true,
      },
    });
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: {
      id: orderItem.mall_platform_order_id,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item is not available", 400);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation is allowed only for paid order items",
      400,
    );
  }
  const duplicate =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirst({
      where: {
        mall_platform_order_item_id: props.orderItemId,
        deleted_at: null,
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  if (duplicate !== null) {
    throw new HttpException(
      "Cancellation request already exists for this order item",
      400,
    );
  }
  const created =
    await MyGlobal.prisma.mall_platform_cancellation_requests.create({
      data: await MallPlatformCancellationRequestCollector.collect({
        body: props.body,
        orderItem: {
          id: props.orderItemId,
        },
      }),
      ...MallPlatformCancellationRequestTransformer.select(),
    });
  return await MallPlatformCancellationRequestTransformer.transform(created);
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
// export async function postMallPlatformCustomerOrderItemsOrderItemIdCancellationRequests(props: {
//   customer: CustomerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformCancellationRequest.ICreate;
// }): Promise<IMallPlatformCancellationRequest> {
//   const record = await MyGlobal.prisma.mall_platform_cancellation_requests.create({
//     data: await MallPlatformCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformCancellationRequestTransformer.select(),
//   });
//   return await MallPlatformCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------