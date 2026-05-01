import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestCollector } from "../collectors/ShoppingMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrderItemsItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation is only available for items in 'paid' status",
      422,
    );
  }
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException(
      "Reason is required and must not be empty or whitespace-only",
      422,
    );
  }
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        orderItem: { id: props.itemId },
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return await ShoppingMallCancellationRequestTransformer.transform(record);
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
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerOrderItemsItemIdCancellationRequests(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequest.ICreate;
// }): Promise<IShoppingMallCancellationRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
//     data: await ShoppingMallCancellationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCancellationRequestTransformer.select(),
//   });
//   return await ShoppingMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------