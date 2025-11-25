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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInventoryReservations(props: {
  admin: AdminPayload;
  body: IShoppingMallInventoryReservation.IRequest;
}): Promise<IPageIShoppingMallInventoryReservation> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (
      props.body.shopping_mall_buyer_id !== undefined &&
      props.body.shopping_mall_buyer_id !== null
    ) {
      conditions.shopping_mall_buyer_id = props.body.shopping_mall_buyer_id;
    }

    if (
      props.body.shopping_mall_sale_sku_id !== undefined &&
      props.body.shopping_mall_sale_sku_id !== null
    ) {
      conditions.shopping_mall_sale_sku_id =
        props.body.shopping_mall_sale_sku_id;
    }

    if (
      props.body.shopping_mall_order_id !== undefined &&
      props.body.shopping_mall_order_id !== null
    ) {
      conditions.shopping_mall_order_id = props.body.shopping_mall_order_id;
    }

    if (
      props.body.reservation_status !== undefined &&
      props.body.reservation_status !== null
    ) {
      conditions.reservation_status = props.body.reservation_status;
    }

    if (
      (props.body.reserved_quantity_min !== undefined &&
        props.body.reserved_quantity_min !== null) ||
      (props.body.reserved_quantity_max !== undefined &&
        props.body.reserved_quantity_max !== null)
    ) {
      const quantityCondition: Record<string, number> = {};
      if (
        props.body.reserved_quantity_min !== undefined &&
        props.body.reserved_quantity_min !== null
      ) {
        quantityCondition.gte = props.body.reserved_quantity_min;
      }
      if (
        props.body.reserved_quantity_max !== undefined &&
        props.body.reserved_quantity_max !== null
      ) {
        quantityCondition.lte = props.body.reserved_quantity_max;
      }
      conditions.reserved_quantity = quantityCondition;
    }

    if (
      (props.body.reserved_after !== undefined &&
        props.body.reserved_after !== null) ||
      (props.body.reserved_before !== undefined &&
        props.body.reserved_before !== null)
    ) {
      const createdAtCondition: Record<string, string> = {};
      if (
        props.body.reserved_after !== undefined &&
        props.body.reserved_after !== null
      ) {
        createdAtCondition.gte = props.body.reserved_after;
      }
      if (
        props.body.reserved_before !== undefined &&
        props.body.reserved_before !== null
      ) {
        createdAtCondition.lte = props.body.reserved_before;
      }
      conditions.created_at = createdAtCondition;
    }

    if (
      (props.body.expires_after !== undefined &&
        props.body.expires_after !== null) ||
      (props.body.expires_before !== undefined &&
        props.body.expires_before !== null)
    ) {
      const expiresAtCondition: Record<string, string> = {};
      if (
        props.body.expires_after !== undefined &&
        props.body.expires_after !== null
      ) {
        expiresAtCondition.gte = props.body.expires_after;
      }
      if (
        props.body.expires_before !== undefined &&
        props.body.expires_before !== null
      ) {
        expiresAtCondition.lte = props.body.expires_before;
      }
      conditions.expires_at = expiresAtCondition;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_reservations.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_inventory_reservations.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((reservation) => ({
      id: reservation.id,
      shopping_mall_sale_sku_id: reservation.shopping_mall_sale_sku_id,
      shopping_mall_buyer_id: reservation.shopping_mall_buyer_id,
      shopping_mall_order_id:
        reservation.shopping_mall_order_id === null
          ? undefined
          : reservation.shopping_mall_order_id,
      reserved_quantity: reservation.reserved_quantity,
      reservation_status: typia.assert<
        "active" | "expired" | "released" | "converted"
      >(reservation.reservation_status),
      expires_at: toISOStringSafe(reservation.expires_at),
      created_at: toISOStringSafe(reservation.created_at),
      updated_at: toISOStringSafe(reservation.updated_at),
    })),
  };
}
