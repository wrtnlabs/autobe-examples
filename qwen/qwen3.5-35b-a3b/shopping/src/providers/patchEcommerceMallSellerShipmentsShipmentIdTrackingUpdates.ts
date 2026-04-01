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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTrackingUpdateAtSummaryTransformer } from "../transformers/EcommerceMallShipmentTrackingUpdateAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdTrackingUpdates(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentTrackingUpdate.IRequest;
}): Promise<IPageIEcommerceMallShipmentTrackingUpdate.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Verify shipment exists and belongs to seller
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Build tracking status filter if provided
  const whereInput: Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput =
    {
      shipment_id: props.shipmentId,
      deleted_at: null,
      ...(props.body.tracking_status !== undefined && {
        tracking_status: props.body.tracking_status,
      }),
    } satisfies Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput;
  // Query tracking updates with pagination
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallShipmentTrackingUpdateAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.count({
      where: whereInput,
    });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentTrackingUpdateAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
