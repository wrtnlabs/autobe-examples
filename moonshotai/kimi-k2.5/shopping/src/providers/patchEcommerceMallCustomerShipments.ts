import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_shipmentsWhereInput = {
    AND: [
      {
        order: {
          ecommerce_mall_customer_id: props.customer.id,
        },
      },
    ],
  };
  if (props.body.orderId) {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      ecommerce_mall_order_id: props.body.orderId,
    });
  }
  if (props.body.sellerId) {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      ecommerce_mall_seller_id: props.body.sellerId,
    });
  }
  if (props.body.carrierName) {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      carrier_name: { contains: props.body.carrierName },
    });
  }
  if (props.body.status === "delivered") {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      ecommerce_mall_shipment_deliveries: { isNot: null },
    });
  } else if (props.body.status === "in_transit") {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      ecommerce_mall_shipment_deliveries: { is: null },
    });
  }
  if (props.body.shippedAtFrom || props.body.shippedAtTo) {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      shipped_at: {
        ...(props.body.shippedAtFrom && {
          gte: new Date(props.body.shippedAtFrom),
        }),
        ...(props.body.shippedAtTo && {
          lte: new Date(props.body.shippedAtTo),
        }),
      },
    });
  }
  if (props.body.search) {
    (where.AND as Prisma.ecommerce_mall_shipmentsWhereInput[]).push({
      OR: [
        { carrier_name: { contains: props.body.search } },
        { tracking_number: { contains: props.body.search } },
      ],
    });
  }
  const sortField = props.body.sort ?? "shipped_at";
  const order = props.body.order ?? "desc";
  const orderBy: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    sortField === "carrier_name"
      ? { carrier_name: order }
      : sortField === "created_at"
        ? { created_at: order }
        : { shipped_at: order };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerShipments(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallShipment.IRequest;
// }): Promise<IPageIEcommerceMallShipment.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
//     ...EcommerceMallShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------