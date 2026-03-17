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
import { ShoppingMallTrackingInfoCollector } from "../collectors/ShoppingMallTrackingInfoCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallTrackingInfoTransformer } from "../transformers/ShoppingMallTrackingInfoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipmentsShipmentIdTrackingInfos(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallTrackingInfo.ICreate;
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
  const existing = await MyGlobal.prisma.shopping_mall_tracking_infos.findFirst(
    {
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException(
      "Tracking information already exists for this shipment",
      409,
    );
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) =>
      tx.shopping_mall_tracking_infos.create({
        data: await ShoppingMallTrackingInfoCollector.collect({
          body: props.body,
          shipment: {
            id: shipment.id,
          },
        }),
        ...ShoppingMallTrackingInfoTransformer.select(),
      }),
    );
    return await ShoppingMallTrackingInfoTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      if (Array.isArray(error.meta?.target) === true) {
        if (error.meta.target.includes("shopping_mall_shipment_id")) {
          throw new HttpException(
            "Tracking information already exists for this shipment",
            409,
          );
        }
        if (
          error.meta.target.includes("carrier_name") &&
          error.meta.target.includes("tracking_number")
        ) {
          throw new HttpException(
            "This carrier and tracking number are already registered",
            409,
          );
        }
      }
      throw new HttpException("Tracking information already exists", 409);
    }
    throw error;
  }
}
