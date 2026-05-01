import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerRefundRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const ownership =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      select: {
        orderItem: {
          select: {
            productVariant: {
              select: {
                product: {
                  select: {
                    shopping_mall_seller_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (
    ownership.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(record);
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
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerRefundRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallRefundRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
//     ...ShoppingMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------