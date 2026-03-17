import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentItemAtSummaryTransformer } from "../transformers/ShoppingMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  // 1. Verify the shipment exists and belongs to the given order
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  // 2. Enforce seller ownership — only the seller responsible for this shipment may view its items
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build where clause with optional status filter on the nested order item
  const whereInput = {
    shopping_mall_shipment_id: props.shipmentId,
    ...(props.body.status != null && {
      orderItem: {
        status: props.body.status,
      },
    }),
  } satisfies Prisma.shopping_mall_shipment_itemsWhereInput;
  // 5. Execute count and data queries sequentially
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...ShoppingMallShipmentItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: whereInput,
  });
  // 6. Transform each shipment item record into the summary DTO
  const items = await ArrayUtil.asyncMap(
    data,
    ShoppingMallShipmentItemAtSummaryTransformer.transform,
  );
  // 7. Return paginated result with metadata
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: items,
  };
}
