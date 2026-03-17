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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdVariantSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  productSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.productSnapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (productSnapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Product snapshot does not belong to the specified product.",
      400,
    );
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
      shopping_mall_product_id: props.productId,
    },
    ...(props.body.change_summary !== undefined
      ? {
          change_summary: {
            contains: props.body.change_summary,
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
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "change_summary_asc"
          ? [{ change_summary: "asc" }, { created_at: "desc" }, { id: "desc" }]
          : props.body.sort === "change_summary_desc"
            ? [
                { change_summary: "desc" },
                { created_at: "desc" },
                { id: "desc" },
              ]
            : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[];
  const rows =
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
      rows,
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
