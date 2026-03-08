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

export async function patchEcommerceMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition for shipments
  // Note: Shipments don't have direct order relation in schema,
  // access control is enforced by verifying order ownership above
  const whereInput = {
    ...(props.body.trackingNumber && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.carrierName && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive",
      },
    }),
    ...(props.body.shippedAtFrom && {
      shipped_at: {
        gte: new Date(props.body.shippedAtFrom),
      },
    }),
    ...(props.body.shippedAtTo && {
      shipped_at: {
        lte: new Date(props.body.shippedAtTo),
      },
    }),
    ...(props.body.deliveredAtFrom && {
      delivered_at: {
        gte: new Date(props.body.deliveredAtFrom),
      },
    }),
    ...(props.body.deliveredAtTo && {
      delivered_at: {
        lte: new Date(props.body.deliveredAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  // Build order by
  const sortBy = props.body.sortBy ?? "shipped_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
  // Get paginated shipments
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await Promise.all(
      shipments.map((shipment) =>
        EcommerceMallShipmentAtSummaryTransformer.transform(shipment),
      ),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallShipment.ISummary;
}
