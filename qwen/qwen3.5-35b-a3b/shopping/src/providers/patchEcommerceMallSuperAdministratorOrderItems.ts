import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorOrderItems(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ? parseInt(props.body.page, 10) : 1;
  const limit = props.body.limit
    ? Math.min(Math.max(props.body.limit, 1), 100)
    : 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.order_id !== undefined && {
      ecommerce_mall_order_id: props.body.order_id,
    }),
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.product_variant_id !== undefined && {
      ecommerce_mall_product_variant_id: props.body.product_variant_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: { gte: props.body.updated_at_from },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: { lte: props.body.updated_at_to },
    }),
  };
  const direction: Prisma.SortOrder =
    props.body.order_direction?.toLowerCase() === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput[] =
    props.body.order_by && props.body.order_direction
      ? props.body.order_by === "quantity"
        ? [{ quantity: direction }]
        : props.body.order_by === "unit_price"
          ? [{ unit_price: direction }]
          : [{ created_at: direction }]
      : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.max(0, Math.ceil(total / limit)),
  };
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination,
    data,
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorOrderItems(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallOrderItem.IRequest;
// }): Promise<IPageIEcommerceMallOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
//     ...EcommerceMallOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------