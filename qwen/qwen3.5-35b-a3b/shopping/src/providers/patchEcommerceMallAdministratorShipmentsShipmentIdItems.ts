import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallShipmentItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorShipmentsShipmentIdItems(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentItem.ISummary> {
  // Validate shipment exists (returns 404 if not found)
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter input
  const whereInput: Prisma.ecommerce_mall_shipment_itemsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.quantity_shipped_min !== undefined && {
      quantity_shipped: { gte: props.body.quantity_shipped_min },
    }),
    ...(props.body.quantity_shipped_max !== undefined && {
      quantity_shipped: { lte: props.body.quantity_shipped_max },
    }),
    ...(props.body.created_at_start !== undefined && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: { lte: props.body.created_at_end },
    }),
  };
  // Build order input
  const orderByInput: Prisma.ecommerce_mall_shipment_itemsOrderByWithRelationInput[] =
    props.body.sort_order === "ascending"
      ? props.body.sort_by === "quantity_shipped"
        ? [{ quantity_shipped: "asc" }]
        : [{ created_at: "asc" }]
      : props.body.sort_by === "quantity_shipped"
        ? [{ quantity_shipped: "desc" }]
        : [{ created_at: "desc" }];
  // Execute findMany and count (sequential per instructions)
  const records = await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallShipmentItemAtSummaryTransformer.transform,
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
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorShipmentsShipmentIdItems(props: {
//   administrator: AdministratorPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShipmentItem.IRequest;
// }): Promise<IPageIEcommerceMallShipmentItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
//     ...EcommerceMallShipmentItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallShipmentItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------