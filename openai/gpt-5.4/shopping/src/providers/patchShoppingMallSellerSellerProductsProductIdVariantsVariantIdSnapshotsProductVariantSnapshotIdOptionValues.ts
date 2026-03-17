import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
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

export async function patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  productVariantSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshotOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.productVariantSnapshotId },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
        },
      },
    );
  if (snapshot.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_product_variant_snapshot_id: props.productVariantSnapshotId,
    deleted_at: null,
    ...(props.body.name !== undefined && {
      name: props.body.name,
    }),
    ...(props.body.value !== undefined && {
      value: props.body.value,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          name: {
            contains: props.body.search,
          },
        },
        {
          value: {
            contains: props.body.search,
          },
        },
      ],
    }),
  } satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesWhereInput;
  const orderBy = (
    props.body.sort === "created_at"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "-created_at"
        ? [{ created_at: "desc" }, { id: "asc" }]
        : props.body.sort === "updated_at"
          ? [{ updated_at: "asc" }, { id: "asc" }]
          : props.body.sort === "-updated_at"
            ? [{ updated_at: "desc" }, { id: "asc" }]
            : props.body.sort === "name"
              ? [{ name: "asc" }, { id: "asc" }]
              : props.body.sort === "-name"
                ? [{ name: "desc" }, { id: "asc" }]
                : props.body.sort === "value"
                  ? [{ value: "asc" }, { id: "asc" }]
                  : props.body.sort === "-value"
                    ? [{ value: "desc" }, { id: "asc" }]
                    : [{ created_at: "asc" }, { id: "asc" }]
  ) satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[];
  const rows =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshot_option_values.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshot_option_values.count(
      {
        where,
      },
    );
  return {
    data: rows.map(
      (row) =>
        ({
          id: row.id,
          name: row.name,
          value: row.value,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at.toISOString(),
          deleted_at: row.deleted_at?.toISOString() ?? null,
        }) satisfies IShoppingMallProductVariantSnapshotOptionValue.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
