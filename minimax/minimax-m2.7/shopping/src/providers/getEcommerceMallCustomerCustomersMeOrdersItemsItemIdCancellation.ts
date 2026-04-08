import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeOrdersItemsItemIdCancellation(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // Step 1: Verify order item exists and belongs to the authenticated customer
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      select: {
        id: true,
        ecommerce_mall_order_id: true,
      },
      where: {
        id: props.itemId,
      },
    });
  // Step 2: Authorization check - ensure customer owns this order item
  if (orderItem.ecommerce_mall_order_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Query cancellation request by order item ID using transformer
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        ...EcommerceMallCancellationRequestTransformer.select(),
        where: {
          ecommerce_mall_order_item_id: props.itemId,
        },
      },
    );
  // Step 4: Transform and return the cancellation request response
  return await EcommerceMallCancellationRequestTransformer.transform(
    cancellationRequest,
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeOrdersItemsItemIdCancellation(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------