import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
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

export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const where: Prisma.mall_platform_product_variant_snapshotsWhereInput = {
    product: {
      id: props.productId,
    },
    ...(search === undefined
      ? {}
      : {
          OR: [
            {
              sku_code: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              option_summary: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              snapshot_reason: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              productVariant: {
                sku_code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              productVariant: {
                option_values: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
  };
  const orderBy: Prisma.mall_platform_product_variant_snapshotsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const total: number =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.count({
      where,
    });
  const data =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price_override: true,
            is_active: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                sellerAccount: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended_at: true,
                    deleted_at: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    parentCategory: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            sellerAccount: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                rejection_reason: true,
                suspended_at: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
              },
            },
            category: {
              select: {
                id: true,
                parentCategory: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        sku_code: true,
        option_summary: true,
        price_override: true,
        snapshot_reason: true,
        created_at: true,
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (snapshot) => ({
      id: snapshot.id,
      productVariant: {
        id: snapshot.productVariant.id,
        skuCode: snapshot.productVariant.sku_code,
        optionValues: snapshot.productVariant.option_values,
        priceOverride: snapshot.productVariant.price_override,
        isActive: snapshot.productVariant.is_active,
        product: {
          id: snapshot.productVariant.product.id,
          name: snapshot.productVariant.product.name,
          description: snapshot.productVariant.product.description,
          basePrice: snapshot.productVariant.product.base_price,
          sellerAccount: {
            id: snapshot.productVariant.product.sellerAccount.id,
            email: snapshot.productVariant.product.sellerAccount.email,
            approvalStatus:
              snapshot.productVariant.product.sellerAccount.approval_status,
            rejectionReason:
              snapshot.productVariant.product.sellerAccount.rejection_reason,
            suspendedAt:
              snapshot.productVariant.product.sellerAccount.suspended_at !==
              null
                ? toISOStringSafe(
                    snapshot.productVariant.product.sellerAccount.suspended_at,
                  )
                : null,
            deletedAt:
              snapshot.productVariant.product.sellerAccount.deleted_at !== null
                ? toISOStringSafe(
                    snapshot.productVariant.product.sellerAccount.deleted_at,
                  )
                : null,
            createdAt: toISOStringSafe(
              snapshot.productVariant.product.sellerAccount.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.productVariant.product.sellerAccount.updated_at,
            ),
          } satisfies IMallPlatformSellerAccount.ISummary,
          category:
            snapshot.productVariant.product.category === null
              ? null
              : ({
                  id: snapshot.productVariant.product.category.id,
                  parentCategory:
                    snapshot.productVariant.product.category.parentCategory ===
                    null
                      ? null
                      : ({
                          id: snapshot.productVariant.product.category
                            .parentCategory.id,
                          parentCategory: null,
                          name: snapshot.productVariant.product.category
                            .parentCategory.name,
                          description:
                            snapshot.productVariant.product.category
                              .parentCategory.description,
                          createdAt: toISOStringSafe(
                            snapshot.productVariant.product.category
                              .parentCategory.created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            snapshot.productVariant.product.category
                              .parentCategory.updated_at,
                          ),
                          deletedAt:
                            snapshot.productVariant.product.category
                              .parentCategory.deleted_at !== null
                              ? toISOStringSafe(
                                  snapshot.productVariant.product.category
                                    .parentCategory.deleted_at,
                                )
                              : null,
                        } satisfies IMallPlatformCategory.ISummary),
                  name: snapshot.productVariant.product.category.name,
                  description:
                    snapshot.productVariant.product.category.description,
                  createdAt: toISOStringSafe(
                    snapshot.productVariant.product.category.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    snapshot.productVariant.product.category.updated_at,
                  ),
                  deletedAt:
                    snapshot.productVariant.product.category.deleted_at !== null
                      ? toISOStringSafe(
                          snapshot.productVariant.product.category.deleted_at,
                        )
                      : null,
                } satisfies IMallPlatformCategory.ISummary),
          createdAt: toISOStringSafe(
            snapshot.productVariant.product.created_at,
          ),
          updatedAt: toISOStringSafe(
            snapshot.productVariant.product.updated_at,
          ),
          deletedAt:
            snapshot.productVariant.product.deleted_at !== null
              ? toISOStringSafe(snapshot.productVariant.product.deleted_at)
              : null,
        } satisfies IMallPlatformProduct.ISummary,
        createdAt: toISOStringSafe(snapshot.productVariant.created_at),
        updatedAt: toISOStringSafe(snapshot.productVariant.updated_at),
        deletedAt:
          snapshot.productVariant.deleted_at !== null
            ? toISOStringSafe(snapshot.productVariant.deleted_at)
            : null,
      } satisfies IMallPlatformProductVariant.ISummary,
      product: {
        id: snapshot.product.id,
        name: snapshot.product.name,
        description: snapshot.product.description,
        basePrice: snapshot.product.base_price,
        sellerAccount: {
          id: snapshot.product.sellerAccount.id,
          email: snapshot.product.sellerAccount.email,
          approvalStatus: snapshot.product.sellerAccount.approval_status,
          rejectionReason: snapshot.product.sellerAccount.rejection_reason,
          suspendedAt:
            snapshot.product.sellerAccount.suspended_at !== null
              ? toISOStringSafe(snapshot.product.sellerAccount.suspended_at)
              : null,
          deletedAt:
            snapshot.product.sellerAccount.deleted_at !== null
              ? toISOStringSafe(snapshot.product.sellerAccount.deleted_at)
              : null,
          createdAt: toISOStringSafe(snapshot.product.sellerAccount.created_at),
          updatedAt: toISOStringSafe(snapshot.product.sellerAccount.updated_at),
        } satisfies IMallPlatformSellerAccount.ISummary,
        category:
          snapshot.product.category === null
            ? null
            : ({
                id: snapshot.product.category.id,
                parentCategory:
                  snapshot.product.category.parentCategory === null
                    ? null
                    : ({
                        id: snapshot.product.category.parentCategory.id,
                        parentCategory: null,
                        name: snapshot.product.category.parentCategory.name,
                        description:
                          snapshot.product.category.parentCategory.description,
                        createdAt: toISOStringSafe(
                          snapshot.product.category.parentCategory.created_at,
                        ),
                        updatedAt: toISOStringSafe(
                          snapshot.product.category.parentCategory.updated_at,
                        ),
                        deletedAt:
                          snapshot.product.category.parentCategory
                            .deleted_at !== null
                            ? toISOStringSafe(
                                snapshot.product.category.parentCategory
                                  .deleted_at,
                              )
                            : null,
                      } satisfies IMallPlatformCategory.ISummary),
                name: snapshot.product.category.name,
                description: snapshot.product.category.description,
                createdAt: toISOStringSafe(
                  snapshot.product.category.created_at,
                ),
                updatedAt: toISOStringSafe(
                  snapshot.product.category.updated_at,
                ),
                deletedAt:
                  snapshot.product.category.deleted_at !== null
                    ? toISOStringSafe(snapshot.product.category.deleted_at)
                    : null,
              } satisfies IMallPlatformCategory.ISummary),
        createdAt: toISOStringSafe(snapshot.product.created_at),
        updatedAt: toISOStringSafe(snapshot.product.updated_at),
        deletedAt:
          snapshot.product.deleted_at !== null
            ? toISOStringSafe(snapshot.product.deleted_at)
            : null,
      } satisfies IMallPlatformProduct.ISummary,
      skuCode: snapshot.sku_code,
      optionSummary: snapshot.option_summary,
      priceOverride: snapshot.price_override,
      snapshotReason: snapshot.snapshot_reason,
      createdAt: toISOStringSafe(snapshot.created_at),
    })),
  };
}
