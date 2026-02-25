import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTrackingTransformer } from "../transformers/ShoppingMallShipmentTrackingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentTrackingsShipmentTrackingId(props: {
  seller: SellerPayload;
  shipmentTrackingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentTracking> {
  const record =
    await MyGlobal.prisma.shopping_mall_shipment_trackings.findUniqueOrThrow({
      where: { id: props.shipmentTrackingId },
      ...ShoppingMallShipmentTrackingTransformer.select(),
    });
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallShipmentTrackingTransformer.transform(record);
}
