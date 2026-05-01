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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  if (props.body.sellerId !== undefined) {
    throw new HttpException("Forbidden", 403);
  }
  const buildWhere = (
    extra?: Prisma.shopping_mall_shipmentsWhereInput,
  ): Prisma.shopping_mall_shipmentsWhereInput => {
    const where: Prisma.shopping_mall_shipmentsWhereInput = {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
      ...(extra ?? {}),
    };
    if (props.body.deliveryStatus === "pending") {
      where.delivered_at = null;
    } else if (props.body.deliveryStatus === "delivered") {
      where.delivered_at = { not: null };
    }
    if (props.body.orderId !== undefined) {
      where.shopping_mall_order_id = props.body.orderId;
    }
    if (
      props.body.createdFrom !== undefined ||
      props.body.createdTo !== undefined
    ) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (props.body.createdFrom !== undefined) {
        createdAtFilter.gte = props.body.createdFrom;
      }
      if (props.body.createdTo !== undefined) {
        createdAtFilter.lte = props.body.createdTo;
      }
      where.created_at = createdAtFilter;
    }
    return where;
  };
  if (props.body.cursor !== undefined && props.body.cursor !== "") {
    const pageSize: number = props.body.pageSize ?? 20;
    let decoded: {
      created_at: string;
      id: string;
    };
    try {
      decoded = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString("utf-8"),
      );
    } catch {
      throw new HttpException("Invalid cursor", 400);
    }
    const cursorWhere = {
      OR: [
        { created_at: { lt: decoded.created_at } },
        {
          created_at: decoded.created_at,
          id: { lt: decoded.id },
        },
      ],
    } satisfies Prisma.shopping_mall_shipmentsWhereInput;
    const rawData = await MyGlobal.prisma.shopping_mall_shipments.findMany({
      ...ShoppingMallShipmentAtSummaryTransformer.select(),
      where: buildWhere(cursorWhere),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: pageSize,
    });
    const total = await MyGlobal.prisma.shopping_mall_shipments.count({
      where: buildWhere(),
    });
    return {
      pagination: {
        current: 1,
        limit: pageSize,
        records: total,
        pages: Math.ceil(total / pageSize),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        rawData,
        ShoppingMallShipmentAtSummaryTransformer.transform,
      ),
    } satisfies IPageIShoppingMallShipment.ISummary;
  }
  const page = (props.body.page ?? 1) < 1 ? 1 : (props.body.page ?? 1);
  const limit = props.body.limit ?? 100;
  const skip = Math.max(0, (page - 1) * limit);
  const rawData = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
    where: buildWhere(),
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: buildWhere(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      rawData,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallShipment.ISummary;
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
// export async function patchShoppingMallSellerShipments(props: {
//   seller: SellerPayload;
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