import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const now = new Date("2026-03-18T12:53:12.563Z");
  const nowIso = toISOStringSafe(now) satisfies string &
    tags.Format<"date-time">;
  const hasConfirmationIntent =
    props.body.confirmation_type !== undefined ||
    props.body.confirmed_at !== undefined ||
    props.body.tracking_url !== undefined ||
    props.body.tracking_number !== undefined ||
    props.body.carrier_name !== undefined ||
    props.body.note !== undefined;
  const hasTypeOrTime =
    props.body.confirmation_type !== undefined ||
    props.body.confirmed_at !== undefined;
  if (
    hasTypeOrTime &&
    (props.body.confirmation_type === undefined ||
      props.body.confirmed_at === undefined)
  ) {
    throw new HttpException(
      "confirmation_type and confirmed_at are required when confirmation fields are provided",
      400,
    );
  }
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        order: {
          select: {
            id: true,
            order_code: true,
            placed_at: true,
            deleted_at: true,
          },
        },
        orderItems: {
          where: { deleted_at: null },
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_product_variant_id: true,
            seller_snapshot_id: true,
            shopping_mall_shipment_id: true,
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
            placed_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        shipmentConfirmation: {
          where: { deleted_at: null },
          select: {
            id: true,
            confirmation_type: true,
            confirmed_at: true,
            tracking_url: true,
            tracking_number: true,
            carrier_name: true,
            note: true,
            deleted_at: true,
          },
        },
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  const nextShipmentStatus = props.body.status ?? shipment.status;
  const shouldReconcileOrderItems =
    props.body.status !== undefined && shipment.orderItems.length > 0;
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.status !== undefined) {
      await tx.shopping_mall_shipments.update({
        where: { id: props.shipmentId },
        data: {
          status: nextShipmentStatus,
          updated_at: now,
        },
      });
    }
    if (hasConfirmationIntent) {
      const existingConfirmation = shipment.shipmentConfirmation;
      const confirmationId =
        existingConfirmation?.id ??
        (v4() satisfies string & tags.Format<"uuid">);
      const confirmedAtIso = (() => {
        if (props.body.confirmed_at !== undefined) {
          return props.body.confirmed_at;
        }
        const confirmedAt = existingConfirmation?.confirmed_at;
        if (confirmedAt !== undefined && confirmedAt !== null) {
          return toISOStringSafe(confirmedAt) satisfies string &
            tags.Format<"date-time">;
        }
        return nowIso;
      })();
      const confirmationType = (() => {
        if (props.body.confirmation_type !== undefined) {
          return props.body.confirmation_type;
        }
        const fromExisting = existingConfirmation?.confirmation_type;
        if (fromExisting === undefined) {
          throw new HttpException(
            "confirmation_type is required when confirmation does not exist",
            400,
          );
        }
        return fromExisting;
      })();
      const createData = {
        id: confirmationId,
        shopping_mall_shipment_id: props.shipmentId,
        confirmation_type: confirmationType,
        confirmed_at: new Date(confirmedAtIso),
        tracking_url:
          props.body.tracking_url !== undefined
            ? (props.body.tracking_url ?? null)
            : (existingConfirmation?.tracking_url ?? null),
        tracking_number:
          props.body.tracking_number !== undefined
            ? (props.body.tracking_number ?? null)
            : (existingConfirmation?.tracking_number ?? null),
        carrier_name:
          props.body.carrier_name !== undefined
            ? (props.body.carrier_name ?? null)
            : (existingConfirmation?.carrier_name ?? null),
        note:
          props.body.note !== undefined
            ? (props.body.note ?? null)
            : (existingConfirmation?.note ?? null),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      const updateData = {
        ...(props.body.confirmation_type !== undefined && {
          confirmation_type: props.body.confirmation_type,
        }),
        ...(props.body.confirmed_at !== undefined && {
          confirmed_at: new Date(props.body.confirmed_at),
        }),
        ...(props.body.tracking_url !== undefined && {
          tracking_url: props.body.tracking_url ?? null,
        }),
        ...(props.body.tracking_number !== undefined && {
          tracking_number: props.body.tracking_number ?? null,
        }),
        ...(props.body.carrier_name !== undefined && {
          carrier_name: props.body.carrier_name ?? null,
        }),
        ...(props.body.note !== undefined && {
          note: props.body.note ?? null,
        }),
        updated_at: now,
        deleted_at: null,
      };
      if (hasTypeOrTime) {
        await tx.shopping_mall_shipment_confirmations.upsert({
          where: { shopping_mall_shipment_id: props.shipmentId },
          create: createData,
          update: updateData,
        });
      } else {
        if (existingConfirmation == null) {
          throw new HttpException(
            "confirmation_type and confirmed_at are required when confirmation does not exist",
            400,
          );
        }
        await tx.shopping_mall_shipment_confirmations.update({
          where: { shopping_mall_shipment_id: props.shipmentId },
          data: {
            ...(props.body.tracking_url !== undefined && {
              tracking_url: props.body.tracking_url ?? null,
            }),
            ...(props.body.tracking_number !== undefined && {
              tracking_number: props.body.tracking_number ?? null,
            }),
            ...(props.body.carrier_name !== undefined && {
              carrier_name: props.body.carrier_name ?? null,
            }),
            ...(props.body.note !== undefined && {
              note: props.body.note ?? null,
            }),
            updated_at: now,
            deleted_at: null,
          },
        });
      }
    }
    if (shouldReconcileOrderItems) {
      await tx.shopping_mall_order_items.updateMany({
        where: {
          shopping_mall_shipment_id: props.shipmentId,
          deleted_at: null,
        },
        data: {
          line_item_status: nextShipmentStatus,
          updated_at: now,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        order: {
          select: {
            id: true,
            order_code: true,
            placed_at: true,
            deleted_at: true,
          },
        },
        orderItems: {
          where: { deleted_at: null },
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_product_variant_id: true,
            seller_snapshot_id: true,
            shopping_mall_shipment_id: true,
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
            placed_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        shipmentConfirmation: {
          where: { deleted_at: null },
          select: {
            id: true,
            confirmation_type: true,
            confirmed_at: true,
            tracking_url: true,
            tracking_number: true,
            carrier_name: true,
            note: true,
            deleted_at: true,
          },
        },
      },
    });
  const tracking =
    updated.shipmentConfirmation == null
      ? null
      : ({
          confirmationType: null,
          confirmedAt: null,
          trackingUrl: null,
          trackingNumber: null,
          carrierName: null,
          note: null,
        } satisfies IShoppingMallShipment.ITracking);
  const totalPrice = updated.orderItems.reduce((sum, item) => {
    return sum + item.seller_price_at_purchase * item.quantity;
  }, 0);
  const overallStatus =
    updated.orderItems.length > 0
      ? updated.orderItems[0].line_item_status
      : updated.status;
  return {
    id: updated.id as string & tags.Format<"uuid">,
    order: {
      id: updated.order.id as string & tags.Format<"uuid">,
      orderCode: updated.order.order_code,
      placedAt: toISOStringSafe(updated.order.placed_at) as string &
        tags.Format<"date-time">,
      totalPrice,
      overallStatus,
      deletedAt:
        updated.order.deleted_at === null
          ? null
          : (toISOStringSafe(updated.order.deleted_at) as string &
              tags.Format<"date-time">),
    } satisfies IShoppingMallOrder.ISummary,
    sellerSnapshotId: updated.seller_snapshot_id as string &
      tags.Format<"uuid">,
    status: updated.status,
    orderItems: updated.orderItems.map(
      (item) =>
        ({
          id: item.id as string & tags.Format<"uuid">,
          shopping_mall_order_id: item.shopping_mall_order_id as string &
            tags.Format<"uuid">,
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id as string &
              tags.Format<"uuid">,
          seller_snapshot_id: item.seller_snapshot_id as string &
            tags.Format<"uuid">,
          shopping_mall_shipment_id:
            item.shopping_mall_shipment_id === null
              ? null
              : (item.shopping_mall_shipment_id as string &
                  tags.Format<"uuid">),
          seller_price_at_purchase: item.seller_price_at_purchase,
          quantity: item.quantity as number & tags.Type<"int32">,
          line_item_status: item.line_item_status,
          placed_at: toISOStringSafe(item.placed_at) as string &
            tags.Format<"date-time">,
          created_at: toISOStringSafe(item.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(item.updated_at) as string &
            tags.Format<"date-time">,
          deleted_at:
            item.deleted_at === null
              ? null
              : (toISOStringSafe(item.deleted_at) as string &
                  tags.Format<"date-time">),
        }) satisfies IShoppingMallOrderItem.ISummary,
    ),
    tracking,
    createdAt: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
  };
}
