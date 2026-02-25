import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipmentAuditLog";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipmentAuditLog";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderShipmentAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallOrderShipmentAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentsShipmentIdAuditLogs(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipmentAuditLog.IRequest;
}): Promise<IPageIShoppingMallOrderShipmentAuditLog.ISummary> {
  // Verify shipment exists and belongs to the seller
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: { id: props.shipmentId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput = {
    shopping_mall_order_shipment_id: props.shipmentId,
    ...(props.body.event_type !== undefined &&
      props.body.event_type !== null && { event_type: props.body.event_type }),
    ...(props.body.actor_type !== undefined &&
      props.body.actor_type !== null && { actor_type: props.body.actor_type }),
    ...(props.body.created_from !== undefined &&
      props.body.created_from !== null &&
      props.body.created_to !== undefined &&
      props.body.created_to !== null && {
        created_at: {
          gte: new Date(props.body.created_from),
          lte: new Date(props.body.created_to),
        },
      }),
    ...(props.body.created_from !== undefined &&
      props.body.created_from !== null &&
      (props.body.created_to === undefined ||
        props.body.created_to === null) && {
        created_at: { gte: new Date(props.body.created_from) },
      }),
    ...(props.body.created_to !== undefined &&
      props.body.created_to !== null &&
      (props.body.created_from === undefined ||
        props.body.created_from === null) && {
        created_at: { lte: new Date(props.body.created_to) },
      }),
  } satisfies Prisma.shopping_mall_order_shipment_audit_logsWhereInput;
  // Query with pagination
  const data =
    await MyGlobal.prisma.shopping_mall_order_shipment_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallOrderShipmentAuditLogAtSummaryTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.shopping_mall_order_shipment_audit_logs.count({
      where: whereInput,
    });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderShipmentAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
