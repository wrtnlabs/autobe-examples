import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSale.ICreate;
}): Promise<IShoppingMallSale> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.body.shopping_mall_category_id },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  if (category.status !== "active") {
    throw new HttpException("Category is not active", 400);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  const now = new Date();
  const saleId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_sales.create({
    data: {
      id: saleId,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_category_id: props.body.shopping_mall_category_id,
      code: props.body.code,
      title: props.body.title,
      description: props.body.description,
      brand: props.body.brand ?? null,
      condition: props.body.condition,
      status: props.body.status ?? "draft",
      short_description: props.body.short_description ?? null,
      meta_keywords: props.body.meta_keywords ?? null,
      weight: props.body.weight ?? null,
      dimension_length: props.body.dimension_length ?? null,
      dimension_width: props.body.dimension_width ?? null,
      dimension_height: props.body.dimension_height ?? null,
      manufacturer: props.body.manufacturer ?? null,
      return_policy_days: props.body.return_policy_days,
      warranty_info: props.body.warranty_info ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    code: created.code,
    title: created.title,
    description: created.description,
    brand: created.brand ?? undefined,
    condition: created.condition,
    status: created.status,
    short_description: created.short_description ?? undefined,
    meta_keywords: created.meta_keywords ?? undefined,
    weight: created.weight ?? undefined,
    dimension_length: created.dimension_length ?? undefined,
    dimension_width: created.dimension_width ?? undefined,
    dimension_height: created.dimension_height ?? undefined,
    manufacturer: created.manufacturer ?? undefined,
    return_policy_days: created.return_policy_days,
    warranty_info: created.warranty_info ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    seller: {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: seller.email_verified,
    },
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      image_url: category.image_url ?? undefined,
      parent_id: category.parent_id ?? undefined,
      status: category.status,
      display_order: category.display_order,
      product_count: category.product_count,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
    },
  };
}
