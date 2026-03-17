import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingInfoId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
    where: {
      id: props.shipmentId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const trackingInfo =
    await MyGlobal.prisma.shopping_mall_tracking_infos.findFirstOrThrow({
      where: {
        id: props.trackingInfoId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
      },
    });
  if (trackingInfo.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Tracking info does not belong to the specified shipment",
      400,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_tracking_infos.update({
    where: {
      id: props.trackingInfoId,
    },
    data: {
      updated_at: now,
      deleted_at: now,
    },
  });
}
