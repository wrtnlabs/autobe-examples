import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentConfirmationCollector } from "../collectors/ShoppingMallShipmentConfirmationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberShipmentsShipmentIdConfirmations(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
            orderItems: {
              select: {
                id: true,
                sellerSnapshot: {
                  select: { id: true },
                },
                productVariant: {
                  select: {
                    product: {
                      select: { shopping_mall_seller_id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  const sellerIds = new Set<string>();
  for (const item of shipment.order.orderItems) {
    sellerIds.add(item.productVariant.product.shopping_mall_seller_id);
  }
  if (!sellerIds.has(props.member.id)) {
    throw new HttpException("Forbidden", 403);
  }
  const currentStatus: string = shipment.status;
  if (
    currentStatus === "delivered" ||
    currentStatus === "cancelled" ||
    currentStatus === "refunded"
  ) {
    throw new HttpException("Shipment is not eligible", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallShipmentConfirmationCollector.collect({
      body: props.body,
    });
    const confirmation = await tx.shopping_mall_shipment_confirmations.create({
      data,
      ...ShoppingMallShipmentConfirmationTransformer.select(),
    });
    const nextStatus = (() => {
      const t = props.body.confirmationType;
      if (t === "shipped") return "shipped";
      if (t === "delivered") return "delivered";
      return shipment.status;
    })();
    if (nextStatus !== shipment.status) {
      await tx.shopping_mall_shipments.update({
        where: { id: shipment.id },
        data: { status: nextStatus, updated_at: new Date() },
      });
    }
    return confirmation;
  });
  return ShoppingMallShipmentConfirmationTransformer.transform(created);
}
