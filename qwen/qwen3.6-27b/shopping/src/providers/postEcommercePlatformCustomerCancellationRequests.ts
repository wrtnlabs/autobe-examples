import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
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
import { EcommercePlatformCancellationRequestCollector } from "../collectors/EcommercePlatformCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformCancellationRequestTransformer } from "../transformers/EcommercePlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformCancellationRequest.ICreate;
}): Promise<IEcommercePlatformCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_platform_order_items.findFirstOrThrow({
      where: {
        id: props.body.orderItemId,
        order: {
          customerProfile: {
            ecommerce_platform_customer_id: props.customer.id,
          },
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item must be in paid status to request cancellation",
      400,
    );
  }
  const existingShipment =
    await MyGlobal.prisma.ecommerce_platform_shipment_items.findFirst({
      where: {
        ecommerce_platform_order_item_id: props.body.orderItemId,
        shipment: {
          deleted_at: null,
        },
      },
    });
  if (existingShipment) {
    throw new HttpException(
      "Cancellation is not permitted for shipped items",
      400,
    );
  }
  const existingRequest =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findFirst({
      where: {
        ecommerce_platform_order_item_id: props.body.orderItemId,
      },
    });
  if (existingRequest) {
    throw new HttpException(
      "A cancellation request already exists for this order item",
      409,
    );
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.create({
      data: await EcommercePlatformCancellationRequestCollector.collect({
        body: props.body,
        ecommercePlatformCustomers: { id: props.customer.id },
      }),
      ...EcommercePlatformCancellationRequestTransformer.select(),
    });
  return await EcommercePlatformCancellationRequestTransformer.transform(
    record,
  );
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
// import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerCancellationRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformCancellationRequest.ICreate;
// }): Promise<IEcommercePlatformCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_platform_cancellation_requests.create({
//     data: await EcommercePlatformCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformCancellationRequestTransformer.select(),
//   });
//   return await EcommercePlatformCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------