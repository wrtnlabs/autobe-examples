import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Verify SKU uniqueness for this seller
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        sku: props.body.sku,
        deleted_at: null,
      },
    });

  if (existingProduct) {
    throw new HttpException("SKU must be unique per seller", 400);
  }

  // Verify category exists and is active
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      id: props.body.category.id,
      deleted_at: null,
      active: true,
    },
  });

  if (!category) {
    throw new HttpException("Category not found or inactive", 404);
  }

  // Create the product
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      description: props.body.description,
      sku: props.body.sku,
      price: props.body.price,
      compare_price: props.body.compare_price ?? null,
      cost_price: props.body.cost_price ?? null,
      stock_quantity: props.body.stock_quantity,
      status: props.body.status,
      condition: props.body.condition,
      weight: props.body.weight ?? null,
      dimensions: props.body.dimensions ?? null,
      shopping_mall_category_id: props.body.category.id,
      shopping_mall_seller_id: props.seller.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          display_order: true,
          active: true,
          parent_id: true,
          created_at: true,
          updated_at: true,
          parent: {
            select: {
              id: true,
              name: true,
              description: true,
              display_order: true,
              active: true,
              parent_id: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  // Get seller details for response
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
      business_name: true,
      contact_person: true,
      email: true,
      status: true,
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    sku: created.sku,
    price: created.price,
    compare_price:
      created.compare_price === null ? undefined : created.compare_price,
    cost_price: created.cost_price === null ? undefined : created.cost_price,
    stock_quantity: created.stock_quantity,
    status: created.status,
    condition: created.condition,
    weight: created.weight === null ? undefined : created.weight,
    dimensions: created.dimensions === null ? undefined : created.dimensions,
    category: {
      id: created.category.id,
      name: created.category.name,
      description: created.category.description ?? undefined,
      display_order: created.category.display_order,
      active: created.category.active,
      parent_id:
        created.category.parent_id ?? (v4() as string & tags.Format<"uuid">),
      created_at: toISOStringSafe(created.category.created_at),
      updated_at: toISOStringSafe(created.category.updated_at),
      parent: created.category.parent
        ? {
            id: created.category.parent.id,
            name: created.category.parent.name,
            description: created.category.parent.description ?? undefined,
            display_order: created.category.parent.display_order,
            active: created.category.parent.active,
            parent_id:
              created.category.parent.parent_id ??
              (v4() as string & tags.Format<"uuid">),
            created_at: toISOStringSafe(created.category.parent.created_at),
            updated_at: toISOStringSafe(created.category.parent.updated_at),
          }
        : undefined,
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
      contact_person: seller.contact_person,
      email: seller.email,
      status: seller.status,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
