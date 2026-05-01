import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerRefundRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  // Verify snapshot exists and trace ownership chain for authorization
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          shopping_mall_refund_request_id: true,
          refundRequest: {
            select: {
              id: true,
              orderItem: {
                select: {
                  id: true,
                  order: {
                    select: {
                      id: true,
                      shopping_mall_customer_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  // Verify snapshot belongs to the given requestId
  if (snapshot.shopping_mall_refund_request_id !== props.requestId) {
    throw new HttpException("Snapshot not found for this refund request", 404);
  }
  // Authorization: customer must own the parent order
  if (
    snapshot.refundRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch full data with transformer
  const record =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallRefundRequestSnapshotTransformer.transform(record);
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
// import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerRefundRequestsRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallRefundRequestSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findFirstOrThrow({
//     ...ShoppingMallRefundRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallRefundRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------