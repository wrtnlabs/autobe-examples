import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate shipment exists and seller has access
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
      items: {
        some: {
          orderItem: {
            shopping_mall_seller_id: props.seller.id,
            deleted_at: null,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Build where clause for filtering
  const whereInput: Prisma.shopping_mall_shipment_itemsWhereInput = {
    shipment_id: props.shipmentId,
    deleted_at: null,
    orderItem: {
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
    },
  } satisfies Prisma.shopping_mall_shipment_itemsWhereInput;
  // Build order by clause with explicit field mapping
  const orderByInput: Prisma.shopping_mall_shipment_itemsOrderByWithRelationInput[] =
    props.body.sort && props.body.sort.length > 0
      ? props.body.sort.map((sortExpr) => {
          const [field, direction] = sortExpr.split(",") as [
            string,
            "asc" | "desc",
          ];
          const dir = direction === "asc" ? "asc" : "desc";
          switch (field) {
            case "quantity":
              return { orderItem: { quantity: dir } };
            case "unit_price":
              return { orderItem: { unit_price: dir } };
            case "status":
              return { orderItem: { status: dir } };
            case "created_at":
              return { created_at: dir };
            default:
              return { created_at: dir };
          }
        })
      : [{ created_at: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallShipmentItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_shipment_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
