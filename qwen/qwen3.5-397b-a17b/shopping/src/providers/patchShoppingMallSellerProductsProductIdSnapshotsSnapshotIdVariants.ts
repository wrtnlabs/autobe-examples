import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
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

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotVariant.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      400,
    );
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        deleted_at: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.shopping_mall_product_snapshot_variantsWhereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
    ...(props.body.search !== undefined && {
      sku_code: { contains: props.body.search },
    }),
    ...(props.body.price_override_min !== undefined && {
      price_override: { gte: props.body.price_override_min },
    }),
    ...(props.body.price_override_max !== undefined && {
      price_override: { lte: props.body.price_override_max },
    }),
    ...(props.body.stock_quantity_min !== undefined && {
      stock_quantity: { gte: props.body.stock_quantity_min },
    }),
    ...(props.body.stock_quantity_max !== undefined && {
      stock_quantity: { lte: props.body.stock_quantity_max },
    }),
  } satisfies Prisma.shopping_mall_product_snapshot_variantsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        shopping_mall_product_snapshot_id: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.count({
      where: whereInput,
    });
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: snapshot.shopping_mall_category_id },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
      },
    });
  const parentCategory = category.parent_id
    ? await MyGlobal.prisma.shopping_mall_categories.findUnique({
        where: { id: category.parent_id },
        select: {
          id: true,
          name: true,
          description: true,
          parent_id: true,
        },
      })
    : null;
  const parentCategorySummary: IShoppingMallCategory.ISummary["parent"] =
    parentCategory
      ? {
          id: parentCategory.id as string & tags.Format<"uuid">,
          name: parentCategory.name,
          description: parentCategory.description,
          parent: null,
          hasChildren: false,
        }
      : null;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((variant) => ({
      id: variant.id as string & tags.Format<"uuid">,
      sku_code: variant.sku_code,
      price_override: variant.price_override ?? null,
      stock_quantity: variant.stock_quantity,
      created_at: toISOStringSafe(variant.created_at) as string &
        tags.Format<"date-time">,
      snapshot: {
        id: snapshot.id as string & tags.Format<"uuid">,
        name: snapshot.name,
        base_price: snapshot.base_price,
        created_at: toISOStringSafe(snapshot.created_at) as string &
          tags.Format<"date-time">,
        product: {
          min: product.base_price,
          max: product.base_price,
        } satisfies IShoppingMallProduct.ISummary,
        category: {
          id: category.id as string & tags.Format<"uuid">,
          name: category.name,
          description: category.description,
          parent: parentCategorySummary,
          hasChildren: false,
        } satisfies IShoppingMallCategory.ISummary,
      } satisfies IShoppingMallProductSnapshot.ISummary,
    })),
  };
}
