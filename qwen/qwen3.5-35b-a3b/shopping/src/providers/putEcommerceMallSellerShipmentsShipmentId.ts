import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment> {
  // Load the shipment and verify it exists
  const existing =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        deleted_at: true,
      },
    });
  // Verify the shipment is not soft deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify seller owns this shipment
  if (existing.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update input with only allowed fields
  const updateData: Prisma.ecommerce_mall_shipmentsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.delivery_address !== undefined && {
      delivery_address: props.body.delivery_address,
    }),
    ...(props.body.estimated_delivery_at !== undefined &&
      props.body.estimated_delivery_at !== null && {
        estimated_delivery_at: new Date(props.body.estimated_delivery_at),
      }),
  } satisfies Prisma.ecommerce_mall_shipmentsUpdateInput;
  // Apply the update with complete response projection
  const updated = await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
    ...EcommerceMallShipmentTransformer.select(),
  });
  // Transform and return the complete response
  return await EcommerceMallShipmentTransformer.transform(updated);
}
