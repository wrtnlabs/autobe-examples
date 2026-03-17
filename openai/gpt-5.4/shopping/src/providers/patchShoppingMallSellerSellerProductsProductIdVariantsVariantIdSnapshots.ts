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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_product_variant_id: props.variantId,
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
          created_at: {
            ...(props.body.created_at_from !== undefined
              ? {
                  gte: new Date(props.body.created_at_from),
                }
              : {}),
            ...(props.body.created_at_to !== undefined
              ? {
                  lte: new Date(props.body.created_at_to),
                }
              : {}),
          },
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
            { id: "desc" },
          ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
        : props.body.sort === "change_summary_asc"
          ? ([
              { change_summary: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
          : props.body.sort === "change_summary_desc"
            ? ([
                { change_summary: "desc" },
                { id: "desc" },
              ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[])
            : ([
                { created_at: "desc" },
                { id: "desc" },
              ] satisfies Prisma.shopping_mall_product_variant_snapshotsOrderByWithRelationInput[]);
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        change_summary: true,
        created_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_summary: true,
            price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        productSnapshot: {
          select: {
            id: true,
            created_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                variantSnapshots: true,
              },
            },
          },
        },
        optionValues: {
          select: {
            id: true,
            name: true,
            value: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshot_option_valuesFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (snapshot) =>
        ({
          id: snapshot.id,
          productVariant: {
            id: snapshot.productVariant.id,
            sku_code: snapshot.productVariant.sku_code,
            option_summary: snapshot.productVariant.option_summary,
            price: snapshot.productVariant.price,
            created_at: snapshot.productVariant.created_at.toISOString(),
            updated_at: snapshot.productVariant.updated_at.toISOString(),
            deleted_at:
              snapshot.productVariant.deleted_at?.toISOString() ?? null,
          } satisfies IShoppingMallProductVariant.ISummary,
          productSnapshot:
            snapshot.productSnapshot === null
              ? null
              : ({
                  id: snapshot.productSnapshot.id,
                  product: {
                    id: snapshot.productSnapshot.product.id,
                    name: snapshot.productSnapshot.product.name,
                    description: snapshot.productSnapshot.product.description,
                    base_price: snapshot.productSnapshot.product.base_price,
                    status: snapshot.productSnapshot.product.status,
                    seller: {
                      id: snapshot.productSnapshot.product.seller.id,
                      email: snapshot.productSnapshot.product.seller.email,
                      approval_status:
                        snapshot.productSnapshot.product.seller.approval_status,
                      rejection_reason:
                        snapshot.productSnapshot.product.seller
                          .rejection_reason,
                      suspended:
                        snapshot.productSnapshot.product.seller.suspended,
                      banned: snapshot.productSnapshot.product.seller.banned,
                      created_at:
                        snapshot.productSnapshot.product.seller.created_at.toISOString(),
                      updated_at:
                        snapshot.productSnapshot.product.seller.updated_at.toISOString(),
                      deleted_at:
                        snapshot.productSnapshot.product.seller.deleted_at?.toISOString() ??
                        null,
                    } satisfies IShoppingMallSeller.ISummary,
                    category:
                      snapshot.productSnapshot.product.category === null
                        ? null
                        : ({
                            id: snapshot.productSnapshot.product.category.id,
                            name: snapshot.productSnapshot.product.category
                              .name,
                            description:
                              snapshot.productSnapshot.product.category
                                .description,
                            parent:
                              snapshot.productSnapshot.product.category
                                .parent === null
                                ? null
                                : ({
                                    id: snapshot.productSnapshot.product
                                      .category.parent.id,
                                    name: snapshot.productSnapshot.product
                                      .category.parent.name,
                                    description:
                                      snapshot.productSnapshot.product.category
                                        .parent.description,
                                    parent: null,
                                    created_at:
                                      snapshot.productSnapshot.product.category.parent.created_at.toISOString(),
                                    updated_at:
                                      snapshot.productSnapshot.product.category.parent.updated_at.toISOString(),
                                    deleted_at:
                                      snapshot.productSnapshot.product.category.parent.deleted_at?.toISOString() ??
                                      null,
                                  } satisfies IShoppingMallCategory.ISummary),
                            created_at:
                              snapshot.productSnapshot.product.category.created_at.toISOString(),
                            updated_at:
                              snapshot.productSnapshot.product.category.updated_at.toISOString(),
                            deleted_at:
                              snapshot.productSnapshot.product.category.deleted_at?.toISOString() ??
                              null,
                          } satisfies IShoppingMallCategory.ISummary),
                    created_at:
                      snapshot.productSnapshot.product.created_at.toISOString(),
                    updated_at:
                      snapshot.productSnapshot.product.updated_at.toISOString(),
                    deleted_at:
                      snapshot.productSnapshot.product.deleted_at?.toISOString() ??
                      null,
                  } satisfies IShoppingMallProduct.ISummary,
                  image_copy_count: 0 satisfies number as number,
                  variant_snapshot_count: snapshot.productSnapshot._count
                    .variantSnapshots satisfies number as number,
                  created_at: snapshot.productSnapshot.created_at.toISOString(),
                } satisfies IShoppingMallProductSnapshot.ISummary),
          skuCode: snapshot.productVariant.sku_code,
          price: snapshot.productVariant.price,
          changeSummary: snapshot.change_summary,
          optionValues: snapshot.optionValues.map(
            (optionValue) =>
              ({
                id: optionValue.id,
                name: optionValue.name,
                value: optionValue.value,
                created_at: optionValue.created_at.toISOString(),
                updated_at: optionValue.updated_at.toISOString(),
                deleted_at: optionValue.deleted_at?.toISOString() ?? null,
              }) satisfies IShoppingMallProductVariantSnapshotOptionValue.ISummary,
          ),
          createdAt: snapshot.created_at.toISOString(),
        }) satisfies IShoppingMallProductVariantSnapshot.ISummary,
    ),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
