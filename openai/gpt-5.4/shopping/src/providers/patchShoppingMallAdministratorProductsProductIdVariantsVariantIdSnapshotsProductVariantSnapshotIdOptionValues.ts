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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotIdOptionValues(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  productVariantSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshotOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
    },
    select: { id: true },
  });
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.productVariantSnapshotId,
        shopping_mall_product_variant_id: props.variantId,
      },
      select: { id: true },
    },
  );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
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
            mode: "insensitive",
          },
        },
        {
          value: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
  } satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesWhereInput;
  const orderBy =
    props.body.sort === "created_at"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
      : props.body.sort === "-created_at"
        ? ([
            { created_at: "desc" },
            { id: "desc" },
          ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
        : props.body.sort === "updated_at"
          ? ([
              { updated_at: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
          : props.body.sort === "-updated_at"
            ? ([
                { updated_at: "desc" },
                { id: "desc" },
              ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
            : props.body.sort === "name"
              ? ([
                  { name: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
              : props.body.sort === "-name"
                ? ([
                    { name: "desc" },
                    { id: "desc" },
                  ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
                : props.body.sort === "value"
                  ? ([
                      { value: "asc" },
                      { id: "asc" },
                    ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
                  : props.body.sort === "-value"
                    ? ([
                        { value: "desc" },
                        { id: "desc" },
                      ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[])
                    : ([
                        { created_at: "asc" },
                        { id: "asc" },
                      ] satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesOrderByWithRelationInput[]);
  const data =
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
    data: data.map(
      (row) =>
        ({
          id: row.id,
          name: row.name,
          value: row.value,
          created_at: toISOStringSafe(row.created_at),
          updated_at: toISOStringSafe(row.updated_at),
          deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
