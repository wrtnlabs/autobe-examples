import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformOrderItemAtSummaryTransformer } from "../transformers/MallPlatformOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerOrdersOrderIdOrderItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItem.IRequest;
}): Promise<IPageIMallPlatformOrderItem.ISummary> {
  if (props.customer.type !== "customer") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const order = await MyGlobal.prisma.mall_platform_orders.findUnique({
    where: {
      id: props.orderId,
    },
    select: {
      id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Not Found", 404);
  }
  const where = {
    mall_platform_order_id: props.orderId,
    ...(props.body.mallPlatformProductVariantId !== undefined && {
      mall_platform_product_variant_id: props.body.mallPlatformProductVariantId,
    }),
    ...(props.body.mallPlatformSellerId !== undefined && {
      mall_platform_seller_id: props.body.mallPlatformSellerId,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
  } satisfies Prisma.mall_platform_order_itemsWhereInput;
  const records = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    ...MallPlatformOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_order_items.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformOrderItemAtSummaryTransformer.transform,
    ),
  };
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
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerOrdersOrderIdOrderItems(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrderItem.IRequest;
// }): Promise<IPageIMallPlatformOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_order_items.findMany({
//     ...MallPlatformOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------