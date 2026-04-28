import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformRefundRequestCollector } from "../collectors/EcommercePlatformRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformRefundRequestTransformer } from "../transformers/EcommercePlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformRefundRequest.ICreate;
}): Promise<IEcommercePlatformRefundRequest> {
  // Validate ownership of the order item and gather status info
  const orderItem =
    await MyGlobal.prisma.ecommerce_platform_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        status: true,
        updated_at: true,
        order: {
          select: {
            customerProfile: {
              select: {
                ecommerce_platform_customer_id: true,
              },
            },
          },
        },
        refundRequest: {
          select: {
            id: true,
          },
        },
      },
    });
  // Customer must own the order
  if (
    orderItem.order.customerProfile.ecommerce_platform_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("You do not own this order item", 403);
  }
  // Order item status must be 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund requests can only be submitted for delivered items",
      400,
    );
  }
  // Validate 7-day refund window from delivery timestamp
  const deliveryTimestamp = orderItem.updated_at.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - deliveryTimestamp > sevenDaysMs) {
    throw new HttpException(
      "Refund requests must be submitted within 7 days of delivery",
      400,
    );
  }
  // Check for existing refund request
  if (orderItem.refundRequest !== null) {
    throw new HttpException(
      "A refund request for this order item already exists",
      409,
    );
  }
  // Create the refund request using collector and transformer
  const record =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.create({
      data: await EcommercePlatformRefundRequestCollector.collect({
        body: props.body,
      }),
      ...EcommercePlatformRefundRequestTransformer.select(),
    });
  return await EcommercePlatformRefundRequestTransformer.transform(record);
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
// import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerRefundRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformRefundRequest.ICreate;
// }): Promise<IEcommercePlatformRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_platform_refund_requests.create({
//     data: await EcommercePlatformRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformRefundRequestTransformer.select(),
//   });
//   return await EcommercePlatformRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------