import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrdersItemsItemIdSnapshotsSnapshotIdVariantOptions(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshotVariantOption.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
      },
    });
  if (snapshot.shopping_mall_order_item_id !== props.itemId) {
    throw new HttpException(
      "Snapshot does not belong to the specified order item",
      400,
    );
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
      },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_product_id },
      select: {
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Seller does not own this product", 403);
  }
  const orderByInput = (
    props.body.sort && props.body.sort.length > 0
      ? props.body.sort.map((field) => {
          if (field === "optionName") {
            return {
              productOptionValue: {
                optionDefinition: { name: "asc" as const },
              },
            };
          } else if (field === "optionValue") {
            return { productOptionValue: { name: "asc" as const } };
          } else if (field === "createdAt") {
            return { created_at: "asc" as const };
          }
          return { created_at: "desc" as const };
        })
      : [{ created_at: "desc" as const }]
  ) satisfies Prisma.shopping_mall_order_item_snapshot_variant_optionsOrderByWithRelationInput[];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.findMany({
      where: {
        order_item_snapshot_id: props.snapshotId,
      },
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.count({
      where: {
        order_item_snapshot_id: props.snapshotId,
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  };
}
