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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerInventoryReservations(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryReservation.IRequest;
}): Promise<IPageIShoppingMallInventoryReservation> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (
    props.body.shopping_mall_buyer_id !== null &&
    props.body.shopping_mall_buyer_id !== undefined
  ) {
    whereCondition.shopping_mall_buyer_id = props.body.shopping_mall_buyer_id;
  }

  if (
    props.body.shopping_mall_sale_sku_id !== null &&
    props.body.shopping_mall_sale_sku_id !== undefined
  ) {
    whereCondition.shopping_mall_sale_sku_id =
      props.body.shopping_mall_sale_sku_id;
  }

  if (
    props.body.shopping_mall_order_id !== null &&
    props.body.shopping_mall_order_id !== undefined
  ) {
    whereCondition.shopping_mall_order_id = props.body.shopping_mall_order_id;
  }

  if (
    props.body.reservation_status !== null &&
    props.body.reservation_status !== undefined
  ) {
    whereCondition.reservation_status = props.body.reservation_status;
  }

  if (
    (props.body.reserved_quantity_min !== null &&
      props.body.reserved_quantity_min !== undefined) ||
    (props.body.reserved_quantity_max !== null &&
      props.body.reserved_quantity_max !== undefined)
  ) {
    const reservedQuantityFilter: Record<string, unknown> = {};
    if (
      props.body.reserved_quantity_min !== null &&
      props.body.reserved_quantity_min !== undefined
    ) {
      reservedQuantityFilter.gte = props.body.reserved_quantity_min;
    }
    if (
      props.body.reserved_quantity_max !== null &&
      props.body.reserved_quantity_max !== undefined
    ) {
      reservedQuantityFilter.lte = props.body.reserved_quantity_max;
    }
    whereCondition.reserved_quantity = reservedQuantityFilter;
  }

  if (
    (props.body.reserved_after !== null &&
      props.body.reserved_after !== undefined) ||
    (props.body.reserved_before !== null &&
      props.body.reserved_before !== undefined)
  ) {
    const createdAtFilter: Record<string, unknown> = {};
    if (
      props.body.reserved_after !== null &&
      props.body.reserved_after !== undefined
    ) {
      createdAtFilter.gte = new Date(props.body.reserved_after);
    }
    if (
      props.body.reserved_before !== null &&
      props.body.reserved_before !== undefined
    ) {
      createdAtFilter.lt = new Date(props.body.reserved_before);
    }
    whereCondition.created_at = createdAtFilter;
  }

  if (
    (props.body.expires_after !== null &&
      props.body.expires_after !== undefined) ||
    (props.body.expires_before !== null &&
      props.body.expires_before !== undefined)
  ) {
    const expiresAtFilter: Record<string, unknown> = {};
    if (
      props.body.expires_after !== null &&
      props.body.expires_after !== undefined
    ) {
      expiresAtFilter.gte = new Date(props.body.expires_after);
    }
    if (
      props.body.expires_before !== null &&
      props.body.expires_before !== undefined
    ) {
      expiresAtFilter.lt = new Date(props.body.expires_before);
    }
    whereCondition.expires_at = expiresAtFilter;
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";
  const orderBy = { [orderByField]: orderByDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_reservations.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
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
      shopping_mall_order_id: reservation.shopping_mall_order_id ?? undefined,
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
