import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  // Verify shipment exists
  await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_shipment_itemsWhereInput = {
    shopping_mall_shipment_id: props.shipmentId,
    shipment: {
      deleted_at: null,
    },
    ...(props.body.status && {
      orderItem: {
        status: props.body.status,
      },
    }),
  };
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      created_at: true,
      shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
      orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => ({
    id: item.id,
    created_at: toISOStringSafe(item.created_at),
    shipment: await ShoppingMallShipmentAtSummaryTransformer.transform(
      item.shipment,
    ),
    orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
      item.orderItem,
    ),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
