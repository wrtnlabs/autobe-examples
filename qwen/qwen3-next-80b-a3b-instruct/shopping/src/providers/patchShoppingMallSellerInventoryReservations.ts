import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerInventoryReservations(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryReservation.IRequest;
}): Promise<IPageIShoppingMallInventoryReservation> {
  const { seller, body } = props;
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = (page - 1) * pageSize;

  // Get all inventory units owned by seller
  const ownedUnitIds = (
    await MyGlobal.prisma.shopping_mall_inventory_units.findMany({
      where: { seller_id: seller.id },
      select: { id: true },
    })
  ).map((unit) => unit.id);

  // Build where condition inline without intermediate variables
  const [reservations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_reservations.findMany({
      where: {
        inventory_unit_id: { in: ownedUnitIds },
        expires_at:
          body.status === "active"
            ? { gt: toISOStringSafe(new Date()) }
            : body.status === "expired"
              ? { lte: toISOStringSafe(new Date()) }
              : undefined,
        ...(body.expires_after && {
          expires_at: {
            ...((body.expires_after && {
              gt: toISOStringSafe(body.expires_after),
            }) ||
              {}),
          },
        }),
        ...(body.expires_before && {
          expires_at: {
            ...((body.expires_before && {
              lt: toISOStringSafe(body.expires_before),
            }) ||
              {}),
          },
        }),
        ...(body.unit_id && { inventory_unit_id: body.unit_id }),
        ...(body.order_item_id && { order_item_id: body.order_item_id }),
      },
      select: {
        id: true,
        inventory_unit_id: true,
        order_item_id: true,
        quantity: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        // program_ref: true, // REMOVED - not a valid property in Prisma schema
      },
      skip,
      take: pageSize,
      orderBy: {
        [body.sort_by || "created_at"]: body.order === "desc" ? "desc" : "asc",
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_reservations.count({
      where: {
        inventory_unit_id: { in: ownedUnitIds },
        expires_at:
          body.status === "active"
            ? { gt: toISOStringSafe(new Date()) }
            : body.status === "expired"
              ? { lte: toISOStringSafe(new Date()) }
              : undefined,
        ...(body.expires_after && {
          expires_at: {
            ...((body.expires_after && {
              gt: toISOStringSafe(body.expires_after),
            }) ||
              {}),
          },
        }),
        ...(body.expires_before && {
          expires_at: {
            ...((body.expires_before && {
              lt: toISOStringSafe(body.expires_before),
            }) ||
              {}),
          },
        }),
        ...(body.unit_id && { inventory_unit_id: body.unit_id }),
        ...(body.order_item_id && { order_item_id: body.order_item_id }),
      },
    }),
  ]);

  const data = reservations.map((reservation) => ({
    id: reservation.id,
    inventory_unit_id: reservation.inventory_unit_id,
    order_item_id: reservation.order_item_id,
    quantity: reservation.quantity,
    expires_at: toISOStringSafe(reservation.expires_at),
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    // program_ref: reservation.program_ref === null || reservation.program_ref === undefined
    //   ? undefined
    //   : reservation.program_ref, // REMOVED - reservation doesn't contain program_ref
  }));

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
