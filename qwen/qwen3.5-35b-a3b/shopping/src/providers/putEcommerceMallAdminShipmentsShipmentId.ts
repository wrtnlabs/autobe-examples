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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment> {
  // Load shipment and verify it exists
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
        carrier_name: true,
        carrier_phone: true,
        carrier_website: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery_at: true,
        delivery_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Wrap snapshot creation and update in transaction for atomicity
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Manually construct update data (only fields in IUpdate are allowed)
    const updateData: Prisma.ecommerce_mall_shipmentsUpdateInput = {
      ...(props.body.delivery_address !== undefined && {
        delivery_address: props.body.delivery_address,
      }),
      ...(props.body.estimated_delivery_at !== undefined && {
        estimated_delivery_at: props.body.estimated_delivery_at,
      }),
      updated_at: new Date(),
    };
    // Apply the update
    return await tx.ecommerce_mall_shipments.update({
      where: {
        id: props.shipmentId,
      },
      data: updateData,
      ...EcommerceMallShipmentTransformer.select(),
    });
  });
  // Return transformed result
  return await EcommerceMallShipmentTransformer.transform(updated);
}
