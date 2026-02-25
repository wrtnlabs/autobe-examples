import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ShoppingMallOrderShipmentAuditLogTransformer } from "../transformers/ShoppingMallOrderShipmentAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentsShipmentIdAuditLogsAuditLogId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipmentAuditLog> {
  const auditLog =
    await MyGlobal.prisma.shopping_mall_order_shipment_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.auditLogId },
        select: {
          shopping_mall_order_shipment_id: true,
          shipment: {
            select: {
              shopping_mall_seller_id: true,
            },
          },
        },
      },
    );
  if (auditLog.shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (auditLog.shopping_mall_order_shipment_id !== props.shipmentId) {
    throw new HttpException("Not Found", 404);
  }
  const fullAuditLog =
    await MyGlobal.prisma.shopping_mall_order_shipment_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.auditLogId },
        ...ShoppingMallOrderShipmentAuditLogTransformer.select(),
      },
    );
  return await ShoppingMallOrderShipmentAuditLogTransformer.transform(
    fullAuditLog,
  );
}
