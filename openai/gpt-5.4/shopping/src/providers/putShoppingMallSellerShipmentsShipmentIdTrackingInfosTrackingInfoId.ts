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

export async function putShoppingMallSellerShipmentsShipmentIdTrackingInfosTrackingInfoId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  trackingInfoId: string & tags.Format<"uuid">;
  body: IShoppingMallTrackingInfo.IUpdate;
}): Promise<IShoppingMallTrackingInfo> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const trackingInfo =
      await prisma.shopping_mall_tracking_infos.findFirstOrThrow({
        where: {
          id: props.trackingInfoId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_shipment_id: true,
          carrier_name: true,
          tracking_number: true,
        },
      });
    if (trackingInfo.shopping_mall_shipment_id !== shipment.id) {
      throw new HttpException(
        "Tracking information does not belong to the shipment",
        404,
      );
    }
    const carrierName = props.body.carrier_name ?? trackingInfo.carrier_name;
    const trackingNumber =
      props.body.tracking_number ?? trackingInfo.tracking_number;
    const duplicate = await prisma.shopping_mall_tracking_infos.findFirst({
      where: {
        id: {
          not: trackingInfo.id,
        },
        deleted_at: null,
        carrier_name: carrierName,
        tracking_number: trackingNumber,
      },
      select: {
        id: true,
      },
    });
    if (duplicate !== null) {
      throw new HttpException("Tracking information already exists", 409);
    }
    await prisma.shopping_mall_tracking_infos.update({
      where: {
        id: trackingInfo.id,
      },
      data: {
        ...(props.body.carrier_name !== undefined && {
          carrier_name: props.body.carrier_name,
        }),
        ...(props.body.tracking_number !== undefined && {
          tracking_number: props.body.tracking_number,
        }),
        ...(props.body.tracking_url !== undefined && {
          tracking_url: props.body.tracking_url,
        }),
        updated_at: new Date().toISOString(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_tracking_infos.findFirstOrThrow({
      where: {
        id: props.trackingInfoId,
        deleted_at: null,
        shopping_mall_shipment_id: props.shipmentId,
      },
      ...ShoppingMallTrackingInfoTransformer.select(),
    });
  return await ShoppingMallTrackingInfoTransformer.transform(updated);
}
