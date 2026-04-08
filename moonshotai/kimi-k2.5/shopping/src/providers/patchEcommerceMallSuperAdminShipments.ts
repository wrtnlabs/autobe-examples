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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminShipments(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereConditions: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
  };
  if (props.body.orderId !== null) {
    whereConditions.order_id = props.body.orderId;
  }
  if (props.body.sellerId !== null) {
    whereConditions.seller_id = props.body.sellerId;
  }
  if (props.body.carrierName !== null) {
    whereConditions.carrier_name = { contains: props.body.carrierName };
  }
  if (props.body.shippedAtFrom !== null || props.body.shippedAtTo !== null) {
    whereConditions.shipped_at = {};
    if (props.body.shippedAtFrom !== null) {
      whereConditions.shipped_at.gte = props.body.shippedAtFrom;
    }
    if (props.body.shippedAtTo !== null) {
      whereConditions.shipped_at.lte = props.body.shippedAtTo;
    }
  }
  if (props.body.search !== null) {
    whereConditions.OR = [
      { carrier_name: { contains: props.body.search } },
      { tracking_number: { contains: props.body.search } },
    ];
  }
  // Handle status filter - check existence of delivery record
  if (props.body.status === "delivered") {
    whereConditions.delivery = { isNot: null };
  } else if (props.body.status === "in_transit") {
    whereConditions.delivery = { is: null };
  }
  const sortField = props.body.sort ?? "shipped_at";
  const sortOrder = props.body.order ?? "desc";
  const orderBy: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    sortField === "carrier_name"
      ? { carrier_name: sortOrder }
      : sortField === "created_at"
        ? { created_at: sortOrder }
        : { shipped_at: sortOrder };
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereConditions,
  });
  const transformedShipments = await ArrayUtil.asyncMap(
    shipments,
    EcommerceMallShipmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedShipments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
