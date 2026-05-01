import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
  };
  if (props.body.deliveryStatus === "pending") {
    whereInput.delivered_at = null;
  } else if (props.body.deliveryStatus === "delivered") {
    whereInput.delivered_at = { not: null };
  }
  if (props.body.sellerId !== undefined) {
    whereInput.shopping_mall_seller_id = props.body.sellerId;
  }
  if (
    props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.createdFrom !== undefined) {
      dateFilter.gte = props.body.createdFrom;
    }
    if (props.body.createdTo !== undefined) {
      dateFilter.lte = props.body.createdTo;
    }
    whereInput.created_at = dateFilter;
  }
  const useCursorPagination: boolean =
    props.body.cursor !== undefined || props.body.pageSize !== undefined;
  const take: number = useCursorPagination
    ? (props.body.pageSize ?? 20)
    : (props.body.limit ?? 100);
  const page: number = props.body.page ?? 1;
  const skip: number = useCursorPagination
    ? props.body.cursor !== undefined
      ? 1
      : 0
    : (page - 1) * take;
  const cursor: Prisma.shopping_mall_shipmentsWhereUniqueInput | undefined =
    useCursorPagination && props.body.cursor !== undefined
      ? { id: props.body.cursor }
      : undefined;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
    orderBy: { created_at: "desc" },
    take,
    skip,
    ...(cursor !== undefined && { cursor }),
  });
  const total: number = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: useCursorPagination ? 1 : page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
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
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminOrdersOrderIdShipments(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IShoppingMallShipment.IRequest;
// }): Promise<IPageIShoppingMallShipment.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_shipments.findMany({
//     ...ShoppingMallShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------