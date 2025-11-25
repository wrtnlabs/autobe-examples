import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSalesSaleCodeSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  saleCode: string;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSnapshot> {
  const snapshot = await MyGlobal.prisma.shopping_mall_sale_snapshots.findFirst(
    {
      where: {
        id: props.snapshotId,
      },
      include: {
        sale: true,
        seller: true,
        category: true,
      },
    },
  );

  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }

  if (snapshot.code !== props.saleCode) {
    throw new HttpException("Snapshot not found", 404);
  }

  return {
    id: snapshot.id,
    shopping_mall_sale_id: snapshot.shopping_mall_sale_id,
    sale: snapshot.sale
      ? {
          id: snapshot.sale.id,
          code: snapshot.sale.code,
          title: snapshot.sale.title,
          status: typia.assert<
            | "suspended"
            | "draft"
            | "pending_approval"
            | "published"
            | "archived"
          >(snapshot.sale.status),
          condition: typia.assert<"new" | "refurbished" | "used">(
            snapshot.sale.condition,
          ),
          brand: snapshot.sale.brand === null ? undefined : snapshot.sale.brand,
          short_description:
            snapshot.sale.short_description === null
              ? undefined
              : snapshot.sale.short_description,
          price: 0,
          thumbnail_url: undefined,
          return_policy_days: snapshot.sale.return_policy_days,
          warranty_info:
            snapshot.sale.warranty_info === null
              ? undefined
              : snapshot.sale.warranty_info,
          created_at: toISOStringSafe(snapshot.sale.created_at),
          updated_at: toISOStringSafe(snapshot.sale.updated_at),
          deleted_at: snapshot.sale.deleted_at
            ? toISOStringSafe(snapshot.sale.deleted_at)
            : undefined,
          seller: {} as IShoppingMallSeller.ISummary,
          category: {} as IShoppingMallCategory.ISummary,
        }
      : undefined,
    shopping_mall_seller_id: snapshot.shopping_mall_seller_id,
    seller: snapshot.seller
      ? {
          id: snapshot.seller.id,
          store_name: snapshot.seller.store_name,
          email: snapshot.seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(snapshot.seller.status),
          email_verified: snapshot.seller.email_verified,
        }
      : undefined,
    shopping_mall_category_id: snapshot.shopping_mall_category_id,
    category: snapshot.category
      ? {
          id: snapshot.category.id,
          name: snapshot.category.name,
          slug: snapshot.category.slug,
          description:
            snapshot.category.description === null
              ? undefined
              : snapshot.category.description,
          image_url:
            snapshot.category.image_url === null
              ? undefined
              : snapshot.category.image_url,
          parent_id:
            snapshot.category.parent_id === null
              ? undefined
              : snapshot.category.parent_id,
          status: snapshot.category.status,
          display_order: snapshot.category.display_order,
          product_count: snapshot.category.product_count,
          created_at: toISOStringSafe(snapshot.category.created_at),
          updated_at: toISOStringSafe(snapshot.category.updated_at),
        }
      : undefined,
    code: snapshot.code,
    title: snapshot.title,
    description: snapshot.description,
    brand: snapshot.brand === null ? undefined : snapshot.brand,
    condition: snapshot.condition,
    status: snapshot.status,
    short_description:
      snapshot.short_description === null
        ? undefined
        : snapshot.short_description,
    meta_keywords:
      snapshot.meta_keywords === null ? undefined : snapshot.meta_keywords,
    weight: snapshot.weight === null ? undefined : snapshot.weight,
    dimension_length:
      snapshot.dimension_length === null
        ? undefined
        : snapshot.dimension_length,
    dimension_width:
      snapshot.dimension_width === null ? undefined : snapshot.dimension_width,
    dimension_height:
      snapshot.dimension_height === null
        ? undefined
        : snapshot.dimension_height,
    manufacturer:
      snapshot.manufacturer === null ? undefined : snapshot.manufacturer,
    return_policy_days: snapshot.return_policy_days,
    warranty_info:
      snapshot.warranty_info === null ? undefined : snapshot.warranty_info,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
