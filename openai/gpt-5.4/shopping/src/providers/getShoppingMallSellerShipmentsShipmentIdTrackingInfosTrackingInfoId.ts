import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallTrackingInfoTransformer } from "../transformers/ShoppingMallTrackingInfoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingInfoId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallTrackingInfo> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (
    shipment.deleted_at !== null ||
    shipment.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Not Found", 404);
  }
  const trackingInfo =
    await MyGlobal.prisma.shopping_mall_tracking_infos.findFirstOrThrow({
      where: {
        id: props.trackingInfoId,
        shopping_mall_shipment_id: props.shipmentId,
        deleted_at: null,
      },
      ...ShoppingMallTrackingInfoTransformer.select(),
    });
  return await ShoppingMallTrackingInfoTransformer.transform(trackingInfo);
}
