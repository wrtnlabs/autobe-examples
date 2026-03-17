import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariantSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  // Validate product snapshot exists and belongs to productId
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_seller_id: true,
      },
    });
  // Verify seller owns the product
  if (productSnapshot.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper snapshot_at range handling
  const whereInput: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    product_snapshot_id: props.snapshotId,
    ...(props.body.snapshot_at_from ||
    props.body.snapshot_at_to ||
    props.body.sku_code ||
    props.body.option_values
      ? {
          AND: [
            ...(props.body.snapshot_at_from
              ? [
                  {
                    snapshot_at: {
                      gte: new Date(props.body.snapshot_at_from),
                    },
                  },
                ]
              : []),
            ...(props.body.snapshot_at_to
              ? [
                  {
                    snapshot_at: {
                      lte: new Date(props.body.snapshot_at_to),
                    },
                  },
                ]
              : []),
            ...(props.body.sku_code
              ? [
                  {
                    sku_code: {
                      contains: props.body.sku_code,
                    },
                  },
                ]
              : []),
            ...(props.body.option_values
              ? [
                  {
                    option_values: {
                      contains: props.body.option_values,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput =
    (() => {
      if (!props.body.sort) {
        return { snapshot_at: "desc" };
      }
      const [field, direction] = props.body.sort.split(",");
      if (field === "snapshot_at") {
        return { snapshot_at: direction === "asc" ? "asc" : "desc" };
      }
      if (field === "sku_code") {
        return { sku_code: direction === "asc" ? "asc" : "desc" };
      }
      return { snapshot_at: "desc" };
    })();
  // Query data
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        snapshot_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform to response format
  return {
    data: data.map(
      (record): IShoppingMallProductVariantSnapshot.ISummary => ({
        id: record.id,
        sku_code: record.sku_code,
        option_values: JSON.parse(record.option_values),
        price: record.price ?? null,
        stock_quantity: record.stock_quantity,
        snapshot_at: record.snapshot_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
