import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentItemTransformer } from "../transformers/EcommerceMallShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsShipmentIdItemsItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentItem> {
  // Query shipment item with targeted fields for authorization check
  const shipmentItem =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findFirst({
      where: {
        id: props.itemId,
        ecommerce_mall_shipment_id: props.shipmentId,
      },
      select: {
        id: true,
        orderItem: {
          select: {
            productSnapshot: {
              select: {
                ecommerce_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found", 404);
  }
  // Verify seller authorization - order item must belong to this seller
  if (
    shipmentItem.orderItem.productSnapshot.ecommerce_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch complete shipment item data using transformer
  const completeItem =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallShipmentItemTransformer.select(),
    });
  return await EcommerceMallShipmentItemTransformer.transform(completeItem);
}
