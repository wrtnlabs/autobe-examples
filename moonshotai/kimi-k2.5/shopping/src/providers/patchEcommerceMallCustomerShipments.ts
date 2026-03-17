import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
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
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause - customer can only see shipments for their orders
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    // Customer owns the shipments via order relationship
    order: {
      customer_id: props.customer.id,
    },
    // Apply filters from request body
    ...(body.orderId && { order_id: body.orderId }),
    ...(body.sellerId && { seller_id: body.sellerId }),
    ...(body.carrierName && {
      carrier_name: { contains: body.carrierName, mode: "insensitive" },
    }),
    ...(body.trackingNumber && {
      tracking_number: { contains: body.trackingNumber, mode: "insensitive" },
    }),
    ...(body.shippedAtFrom || body.shippedAtTo
      ? {
          shipped_at: {
            ...(body.shippedAtFrom && { gte: new Date(body.shippedAtFrom) }),
            ...(body.shippedAtTo && { lte: new Date(body.shippedAtTo) }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  // Build orderBy from sort array
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput[] =
    (() => {
      if (!body.sort || body.sort.length === 0) {
        return [{ shipped_at: "desc" }];
      }
      return body.sort.map((sortField) => {
        const direction = sortField.startsWith("-") ? "desc" : "asc";
        const field = sortField.replace(/^[+-]/, "");
        const fieldMapping: Record<string, string> = {
          shippedAt: "shipped_at",
          createdAt: "created_at",
          updatedAt: "updated_at",
        };
        const dbField = fieldMapping[field] || field;
        return {
          [dbField]: direction,
        } as Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
      });
    })();
  // Fetch paginated data
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
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
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
