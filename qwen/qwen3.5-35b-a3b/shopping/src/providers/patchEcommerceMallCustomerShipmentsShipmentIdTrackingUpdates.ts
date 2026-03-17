import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTrackingUpdateAtSummaryTransformer } from "../transformers/EcommerceMallShipmentTrackingUpdateAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipmentsShipmentIdTrackingUpdates(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentTrackingUpdate.IRequest;
}): Promise<IPageIEcommerceMallShipmentTrackingUpdate.ISummary> {
  // Validate shipment exists and belongs to customer's order
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId, deleted_at: null },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
        status: true,
        delivered_at: true,
        deleted_at: true,
        order: {
          select: { customer_id: true },
        },
      },
    });
  // Verify shipment belongs to customer
  if (shipment.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter criteria from request body
  const filterCriteria = {
    shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.tracking_status !== undefined && {
      tracking_status: props.body.tracking_status,
    }),
  } satisfies Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput;
  // Query tracking updates with transformation
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findMany({
      where: filterCriteria,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallShipmentTrackingUpdateAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.count({
      where: filterCriteria,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallShipmentTrackingUpdateAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
