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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorOrderItems(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const pageParam = props.body.page ?? "1";
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const limitRaw = props.body.limit ?? 20;
  const limit = limitRaw > 0 && limitRaw <= 100 ? limitRaw : 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.order_id !== undefined) {
    whereInput.ecommerce_mall_order_id = props.body.order_id;
  }
  if (props.body.seller_id !== undefined) {
    whereInput.seller_id = props.body.seller_id;
  }
  if (props.body.product_variant_id !== undefined) {
    whereInput.ecommerce_mall_product_variant_id =
      props.body.product_variant_id;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const created_at_condition: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      created_at_condition.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      created_at_condition.lte = new Date(props.body.created_at_to);
    }
    whereInput.created_at = created_at_condition;
  }
  if (
    props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
  ) {
    const updated_at_condition: Prisma.DateTimeFilter = {};
    if (props.body.updated_at_from !== undefined) {
      updated_at_condition.gte = new Date(props.body.updated_at_from);
    }
    if (props.body.updated_at_to !== undefined) {
      updated_at_condition.lte = new Date(props.body.updated_at_to);
    }
    whereInput.updated_at = updated_at_condition;
  }
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput[] =
    [];
  if (props.body.order_by === "created_at") {
    orderByInput.push({
      created_at: props.body.order_direction === "ASC" ? "asc" : "desc",
    });
  } else if (props.body.order_by === "quantity") {
    orderByInput.push({
      quantity: props.body.order_direction === "ASC" ? "asc" : "desc",
    });
  } else if (props.body.order_by === "unit_price") {
    orderByInput.push({
      unit_price: props.body.order_direction === "ASC" ? "asc" : "desc",
    });
  } else {
    orderByInput.push({
      created_at: "desc",
    });
  }
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorOrderItems(props: {
//   administrator: AdministratorPayload;
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