import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentItems(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query total count of shipment items for seller
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: {
      deleted_at: null,
      shipment: {
        seller_id: props.seller.id,
      },
    },
  });
  // If no data, return empty
  if (total === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // Retrieve shipment items data with pagination
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: {
      deleted_at: null,
      shipment: {
        seller_id: props.seller.id,
      },
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      shipment_id: true,
      order_item_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      shipment_id: item.shipment_id,
      order_item_id: item.order_item_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
  };
}
