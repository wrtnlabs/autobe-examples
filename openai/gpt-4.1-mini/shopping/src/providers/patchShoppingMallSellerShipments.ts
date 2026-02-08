import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = 0;
  const where: Prisma.shopping_mall_shipmentsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  };
  const orderBy = {
    created_at: "desc" as const,
  };
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({ where });
  return {
    data: data.map((shipment) => ({
      id: shipment.id,
      seller_id: shipment.seller_id,
      status: shipment.status,
      created_at: toISOStringSafe(shipment.created_at),
      updated_at: toISOStringSafe(shipment.updated_at),
      deleted_at:
        shipment.deleted_at === null
          ? null
          : toISOStringSafe(shipment.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
