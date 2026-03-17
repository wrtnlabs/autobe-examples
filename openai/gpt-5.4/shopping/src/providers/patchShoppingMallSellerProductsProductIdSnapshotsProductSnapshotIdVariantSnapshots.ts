import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsProductSnapshotIdVariantSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot> {
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
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.productSnapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter = {
    ...(props.body.created_at_from !== undefined
      ? { gte: props.body.created_at_from }
      : {}),
    ...(props.body.created_at_to !== undefined
      ? { lte: props.body.created_at_to }
      : {}),
  } satisfies Prisma.DateTimeFilter;
  const where = {
    shopping_mall_product_snapshot_id: props.productSnapshotId,
    productVariant: {
      is: {
        shopping_mall_product_id: props.productId,
      },
    },
    ...(props.body.change_summary !== undefined
      ? {
          change_summary: {
            contains: props.body.change_summary,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: createdAtFilter,
        }
      : {}),
  } satisfies Prisma.shopping_mall_product_variant_snapshotsWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
      : props.body.sort === "created_at_desc"
        ? ([
            { created_at: "desc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
        : props.body.sort === "change_summary_asc"
          ? ([
              { change_summary: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
          : props.body.sort === "change_summary_desc"
            ? ([
                { change_summary: "desc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
            : ([
                { created_at: "desc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[]);
  const records =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallProductVariantSnapshotTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallProductVariantSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
