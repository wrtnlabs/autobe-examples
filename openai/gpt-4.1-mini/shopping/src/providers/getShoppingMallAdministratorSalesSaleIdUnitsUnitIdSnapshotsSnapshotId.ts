import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSaleUnitSnapshotTransformer } from "../transformers/ShoppingMallSaleUnitSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSalesSaleIdUnitsUnitIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleUnitSnapshot> {
  const snapshotRaw =
    await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_sale_unit_id: true,
        shopping_mall_sale_snapshot_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        saleUnit: {
          select: {
            id: true,
            shopping_mall_sale_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sku_code: true,
            price_override: true,
            option_values: true,
            saleUnitSnapshots: { select: { id: true } },
            sale: {
              select: {
                id: true,
                seller: {
                  select: {
                    email: true,
                    id: true,
                    shop_name: true,
                    shop_description: true,
                    logo_uri: true,
                    approval_status: true,
                    rejection_reason: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                name: true,
                updated_at: true,
                deleted_at: true,
                status: true,
                snapshots: {
                  select: {
                    id: true,
                    description: true,
                    base_price: true,
                    category_id: true,
                    shopping_mall_sale_id: true,
                    title: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                description: true,
                base_price: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    description: true,
                  },
                },
                sale_units: {
                  select: {
                    id: true,
                  },
                },
                images: {
                  select: {
                    id: true,
                  },
                },
                sale_specifications: {
                  select: {
                    id: true,
                  },
                },
                sale_reviews: {
                  select: {
                    id: true,
                  },
                },
                sale_questions: {
                  select: {
                    id: true,
                  },
                },
                favorites: {
                  select: {
                    id: true,
                  },
                },
                promotions: {
                  select: {
                    id: true,
                  },
                },
                view_stats: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        saleSnapshot: {
          select: {
            id: true,
            shopping_mall_sale_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            description: true,
            base_price: true,
            category_id: true,
            title: true,
            sale: {
              select: {
                id: true,
                seller: {
                  select: {
                    email: true,
                    id: true,
                    shop_name: true,
                    shop_description: true,
                    logo_uri: true,
                    approval_status: true,
                    rejection_reason: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                name: true,
                updated_at: true,
                deleted_at: true,
                status: true,
                snapshots: { select: { id: true } },
              },
            },
            sale_unit_snapshots: { select: { id: true } },
          },
        },
      },
    });
  function convDate(date: Date | null): string & tags.Format<"date-time"> {
    return (date ?? new Date()).toISOString() as string &
      tags.Format<"date-time">;
  }
  if (snapshotRaw.shopping_mall_sale_unit_id !== props.unitId) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshotRaw.saleUnit.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshotRaw.saleSnapshot.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot: IShoppingMallSaleUnitSnapshot = {
    id: snapshotRaw.id,
    shoppingMallSaleUnitId: snapshotRaw.shopping_mall_sale_unit_id,
    shoppingMallSaleSnapshotId: snapshotRaw.shopping_mall_sale_snapshot_id,
    skuCode: snapshotRaw.sku_code,
    optionValues: snapshotRaw.option_values,
    priceOverride: snapshotRaw.price_override ?? null,
    stockQuantity: snapshotRaw.stock_quantity,
    isActive: snapshotRaw.is_active,
    createdAt: convDate(snapshotRaw.created_at),
    updatedAt: convDate(snapshotRaw.updated_at),
    deletedAt:
      snapshotRaw.deleted_at === null ? null : convDate(snapshotRaw.deleted_at),
    saleUnit: {
      id: snapshotRaw.saleUnit.id,
      shoppingMallSaleId: snapshotRaw.saleUnit.shopping_mall_sale_id,
      createdAt: convDate(snapshotRaw.saleUnit.created_at),
      updatedAt: convDate(snapshotRaw.saleUnit.updated_at),
      deletedAt:
        snapshotRaw.saleUnit.deleted_at === null
          ? null
          : convDate(snapshotRaw.saleUnit.deleted_at),
      skuCode: snapshotRaw.saleUnit.sku_code,
      priceOverride: snapshotRaw.saleUnit.price_override ?? null,
      optionValues: snapshotRaw.saleUnit.option_values,
      saleUnitSnapshots: snapshotRaw.saleUnit.saleUnitSnapshots.map(
        (v: { id: string }) => ({
          id: v.id,
        }),
      ),
      sale: {
        id: snapshotRaw.saleUnit.sale.id,
        seller: {
          email: snapshotRaw.saleUnit.sale.seller.email,
          id: snapshotRaw.saleUnit.sale.seller.id,
          shopName: snapshotRaw.saleUnit.sale.seller.shop_name,
          shopDescription: snapshotRaw.saleUnit.sale.seller.shop_description,
          logoUri: snapshotRaw.saleUnit.sale.seller.logo_uri,
          approvalStatus: snapshotRaw.saleUnit.sale.seller.approval_status,
          rejectionReason: snapshotRaw.saleUnit.sale.seller.rejection_reason,
          updatedAt: convDate(snapshotRaw.saleUnit.sale.seller.updated_at),
          deletedAt:
            snapshotRaw.saleUnit.sale.seller.deleted_at === null
              ? null
              : convDate(snapshotRaw.saleUnit.sale.seller.deleted_at),
        },
        createdAt: convDate(snapshotRaw.saleUnit.sale.created_at),
        name: snapshotRaw.saleUnit.sale.name,
        updatedAt: convDate(snapshotRaw.saleUnit.sale.updated_at),
        deletedAt:
          snapshotRaw.saleUnit.sale.deleted_at === null
            ? null
            : convDate(snapshotRaw.saleUnit.sale.deleted_at),
        status: snapshotRaw.saleUnit.sale.status,
        snapshots: snapshotRaw.saleUnit.sale.snapshots.map(
          (v: {
            id: string;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
            description: string;
            base_price: number;
            category_id: string;
            shopping_mall_sale_id: string;
            title: string;
          }) => ({
            id: v.id,
            createdAt: convDate(v.created_at),
            updatedAt: convDate(v.updated_at),
            deletedAt: v.deleted_at === null ? null : convDate(v.deleted_at),
            description: v.description,
            basePrice: v.base_price,
            categoryId: v.category_id,
            shoppingMallSaleId: v.shopping_mall_sale_id,
            title: v.title,
          }),
        ),
        description: snapshotRaw.saleUnit.sale.description ?? null,
        basePrice: snapshotRaw.saleUnit.sale.base_price,
        category: {
          id: snapshotRaw.saleUnit.sale.category.id,
          name: snapshotRaw.saleUnit.sale.category.name,
          createdAt: convDate(snapshotRaw.saleUnit.sale.category.created_at),
          updatedAt: convDate(snapshotRaw.saleUnit.sale.category.updated_at),
          deletedAt:
            snapshotRaw.saleUnit.sale.category.deleted_at === null
              ? null
              : convDate(snapshotRaw.saleUnit.sale.category.deleted_at),
          description: snapshotRaw.saleUnit.sale.category.description ?? null,
        },
        saleUnits: snapshotRaw.saleUnit.sale.saleUnits.map(
          (v: {
            id: string;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
          }) => ({
            id: v.id,
            createdAt: convDate(v.created_at),
            updatedAt: convDate(v.updated_at),
            deletedAt: v.deleted_at === null ? null : convDate(v.deleted_at),
          }),
        ),
        images: snapshotRaw.saleUnit.sale.images.map((v) => ({ id: v.id })),
        saleSpecifications: snapshotRaw.saleUnit.sale.saleSpecifications.map(
          (v) => ({ id: v.id }),
        ),
        saleReviews: snapshotRaw.saleUnit.sale.saleReviews.map((v) => ({
          id: v.id,
        })),
        saleQuestions: snapshotRaw.saleUnit.sale.saleQuestions.map((v) => ({
          id: v.id,
        })),
        favorites: snapshotRaw.saleUnit.sale.favorites.map((v) => ({
          id: v.id,
        })),
        promotions: snapshotRaw.saleUnit.sale.promotions.map((v) => ({
          id: v.id,
        })),
        viewStats: snapshotRaw.saleUnit.sale.viewStats.map((v) => ({
          id: v.id,
        })),
      },
    },
    saleSnapshot: {
      id: snapshotRaw.saleSnapshot.id,
      shoppingMallSaleId: snapshotRaw.saleSnapshot.shopping_mall_sale_id,
      createdAt: convDate(snapshotRaw.saleSnapshot.created_at),
      updatedAt: convDate(snapshotRaw.saleSnapshot.updated_at),
      deletedAt:
        snapshotRaw.saleSnapshot.deleted_at === null
          ? null
          : convDate(snapshotRaw.saleSnapshot.deleted_at),
      description: snapshotRaw.saleSnapshot.description ?? null,
      basePrice: snapshotRaw.saleSnapshot.base_price,
      categoryId: snapshotRaw.saleSnapshot.category_id,
      title: snapshotRaw.saleSnapshot.title,
      sale: {
        id: snapshotRaw.saleSnapshot.sale.id,
        seller: {
          email: snapshotRaw.saleSnapshot.sale.seller.email,
          id: snapshotRaw.saleSnapshot.sale.seller.id,
          shopName: snapshotRaw.saleSnapshot.sale.seller.shop_name,
          shopDescription:
            snapshotRaw.saleSnapshot.sale.seller.shop_description,
          logoUri: snapshotRaw.saleSnapshot.sale.seller.logo_uri,
          approvalStatus: snapshotRaw.saleSnapshot.sale.seller.approval_status,
          rejectionReason:
            snapshotRaw.saleSnapshot.sale.seller.rejection_reason,
          updatedAt: convDate(snapshotRaw.saleSnapshot.sale.seller.updated_at),
          deletedAt:
            snapshotRaw.saleSnapshot.sale.seller.deleted_at === null
              ? null
              : convDate(snapshotRaw.saleSnapshot.sale.seller.deleted_at),
        },
        createdAt: convDate(snapshotRaw.saleSnapshot.sale.created_at),
        name: snapshotRaw.saleSnapshot.sale.name,
        updatedAt: convDate(snapshotRaw.saleSnapshot.sale.updated_at),
        deletedAt:
          snapshotRaw.saleSnapshot.sale.deleted_at === null
            ? null
            : convDate(snapshotRaw.saleSnapshot.sale.deleted_at),
        status: snapshotRaw.saleSnapshot.sale.status,
        snapshots: snapshotRaw.saleSnapshot.sale.snapshots.map((v) => ({
          id: v.id,
        })),
        description: snapshotRaw.saleSnapshot.sale.description ?? null,
        basePrice: snapshotRaw.saleSnapshot.sale.base_price,
        category: {
          id: snapshotRaw.saleSnapshot.sale.category.id,
          name: snapshotRaw.saleSnapshot.sale.category.name,
          createdAt: convDate(
            snapshotRaw.saleSnapshot.sale.category.created_at,
          ),
          updatedAt: convDate(
            snapshotRaw.saleSnapshot.sale.category.updated_at,
          ),
          deletedAt:
            snapshotRaw.saleSnapshot.sale.category.deleted_at === null
              ? null
              : convDate(snapshotRaw.saleSnapshot.sale.category.deleted_at),
          description:
            snapshotRaw.saleSnapshot.sale.category.description ?? null,
        },
        saleUnits: snapshotRaw.saleSnapshot.sale.saleUnits.map((v) => ({
          id: v.id,
        })),
        images: snapshotRaw.saleSnapshot.sale.images.map((v) => ({ id: v.id })),
        saleSpecifications:
          snapshotRaw.saleSnapshot.sale.saleSpecifications.map((v) => ({
            id: v.id,
          })),
        saleReviews: snapshotRaw.saleSnapshot.sale.saleReviews.map((v) => ({
          id: v.id,
        })),
        saleQuestions: snapshotRaw.saleSnapshot.sale.saleQuestions.map((v) => ({
          id: v.id,
        })),
        favorites: snapshotRaw.saleSnapshot.sale.favorites.map((v) => ({
          id: v.id,
        })),
        promotions: snapshotRaw.saleSnapshot.sale.promotions.map((v) => ({
          id: v.id,
        })),
        viewStats: snapshotRaw.saleSnapshot.sale.viewStats.map((v) => ({
          id: v.id,
        })),
      },
      saleUnitSnapshots: snapshotRaw.saleSnapshot.saleUnitSnapshots.map(
        (v) => ({ id: v.id }),
      ),
    },
  };
  return await ShoppingMallSaleUnitSnapshotTransformer.transform(snapshot);
}
