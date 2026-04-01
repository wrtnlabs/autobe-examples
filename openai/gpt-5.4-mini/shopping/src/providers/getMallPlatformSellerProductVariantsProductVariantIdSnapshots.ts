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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProductVariantsProductVariantIdSnapshots(props: {
  seller: SellerPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
  const productVariant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: {
        id: props.productVariantId,
      },
      select: {
        id: true,
        product: {
          select: {
            seller_account_id: true,
          },
        },
      },
    });
  if (productVariant.product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = 1;
  const limit = 100;
  const snapshots =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
      where: {
        mall_platform_product_variant_id: props.productVariantId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
      select: {
        id: true,
        sku_code: true,
        option_summary: true,
        price_override: true,
        snapshot_reason: true,
        created_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price_override: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
                    parentCategory: {
                      select: {
                        id: true,
                      },
                    },
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
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
                parentCategory: {
                  select: {
                    id: true,
                  },
                },
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
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.count({
      where: {
        mall_platform_product_variant_id: props.productVariantId,
      },
    });
  return {
    data: snapshots.map(
      (snapshot) =>
        ({
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
                  snapshot.productVariant.product.sellerAccount
                    .rejection_reason,
                suspendedAt:
                  snapshot.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                  null,
                deletedAt:
                  snapshot.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                  null,
                createdAt:
                  snapshot.productVariant.product.sellerAccount.created_at.toISOString(),
                updatedAt:
                  snapshot.productVariant.product.sellerAccount.updated_at.toISOString(),
              } satisfies IMallPlatformSellerAccount.ISummary,
              category:
                snapshot.productVariant.product.category === null
                  ? null
                  : ({
                      id: snapshot.productVariant.product.category.id,
                      parentCategory:
                        snapshot.productVariant.product.category
                          .parentCategory === null
                          ? null
                          : ({
                              id: snapshot.productVariant.product.category
                                .parentCategory.id,
                              parentCategory: null,
                              name: "",
                              description: "",
                              createdAt:
                                snapshot.productVariant.product.category.created_at.toISOString(),
                              updatedAt:
                                snapshot.productVariant.product.category.updated_at.toISOString(),
                              deletedAt:
                                snapshot.productVariant.product.category.deleted_at?.toISOString() ??
                                null,
                            } satisfies IMallPlatformCategory.ISummary),
                      name: snapshot.productVariant.product.category.name,
                      description:
                        snapshot.productVariant.product.category.description,
                      createdAt:
                        snapshot.productVariant.product.category.created_at.toISOString(),
                      updatedAt:
                        snapshot.productVariant.product.category.updated_at.toISOString(),
                      deletedAt:
                        snapshot.productVariant.product.category.deleted_at?.toISOString() ??
                        null,
                    } satisfies IMallPlatformCategory.ISummary),
              createdAt:
                snapshot.productVariant.product.created_at.toISOString(),
              updatedAt:
                snapshot.productVariant.product.updated_at.toISOString(),
              deletedAt:
                snapshot.productVariant.product.deleted_at?.toISOString() ??
                null,
            } satisfies IMallPlatformProduct.ISummary,
            createdAt: snapshot.productVariant.created_at.toISOString(),
            updatedAt: snapshot.productVariant.updated_at.toISOString(),
            deletedAt:
              snapshot.productVariant.deleted_at?.toISOString() ?? null,
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
                snapshot.product.sellerAccount.suspended_at?.toISOString() ??
                null,
              deletedAt:
                snapshot.product.sellerAccount.deleted_at?.toISOString() ??
                null,
              createdAt:
                snapshot.product.sellerAccount.created_at.toISOString(),
              updatedAt:
                snapshot.product.sellerAccount.updated_at.toISOString(),
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
                            name: "",
                            description: "",
                            createdAt:
                              snapshot.product.category.created_at.toISOString(),
                            updatedAt:
                              snapshot.product.category.updated_at.toISOString(),
                            deletedAt:
                              snapshot.product.category.deleted_at?.toISOString() ??
                              null,
                          } satisfies IMallPlatformCategory.ISummary),
                    name: snapshot.product.category.name,
                    description: snapshot.product.category.description,
                    createdAt:
                      snapshot.product.category.created_at.toISOString(),
                    updatedAt:
                      snapshot.product.category.updated_at.toISOString(),
                    deletedAt:
                      snapshot.product.category.deleted_at?.toISOString() ??
                      null,
                  } satisfies IMallPlatformCategory.ISummary),
            createdAt: snapshot.product.created_at.toISOString(),
            updatedAt: snapshot.product.updated_at.toISOString(),
            deletedAt: snapshot.product.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformProduct.ISummary,
          skuCode: snapshot.sku_code,
          optionSummary: snapshot.option_summary,
          priceOverride: snapshot.price_override,
          snapshotReason: snapshot.snapshot_reason,
          createdAt: snapshot.created_at.toISOString(),
        }) satisfies IMallPlatformProductVariantSnapshot.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
