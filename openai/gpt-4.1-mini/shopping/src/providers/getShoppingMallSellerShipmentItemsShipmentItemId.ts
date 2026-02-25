import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentItemTransformer } from "../transformers/ShoppingMallShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentItem> {
  // Find the shipment item by id with related shipment and order item data
  const shipmentItemRecord =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      ...ShoppingMallShipmentItemTransformer.select(),
    });
  // Authorization check: ensure the shipment belongs to the requesting seller
  if (shipmentItemRecord.shipment.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform the record into the IShoppingMallShipmentItem response DTO
  const shipmentItem =
    await ShoppingMallShipmentItemTransformer.transform(shipmentItemRecord);
  return shipmentItem;
}
