import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorShipmentsShipmentIdOrderItems(props: {
  administrator: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "administrator";
  };
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const orderItemIds = (
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findMany({
      where: { shopping_mall_shipment_id: props.shipmentId },
      select: { shopping_mall_order_item_id: true },
    })
  ).map(({ shopping_mall_order_item_id }) => shopping_mall_order_item_id);
  if (orderItemIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
    };
  }
  const whereInput = {
    id: { in: orderItemIds },
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where: whereInput }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_order_id: record.shopping_mall_order_id,
      shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
      quantity: record.quantity,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
