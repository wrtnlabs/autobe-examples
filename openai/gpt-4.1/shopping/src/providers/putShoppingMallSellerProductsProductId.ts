import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  if (props.body.default_price !== undefined && props.body.default_price < 0) {
    throw new HttpException("Price must be non-negative", 400);
  }
  if (props.body.business_status !== undefined) {
    const allowedStatuses = [
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ];
    if (!allowedStatuses.includes(props.body.business_status)) {
      throw new HttpException("Invalid business status", 400);
    }
  }
  if (props.body.title !== undefined) {
    const duplicate = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        title: props.body.title,
        id: { not: props.productId },
      },
    });
    if (duplicate) {
      throw new HttpException("Duplicate product title for this seller", 409);
    }
  }
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.default_price !== undefined && {
        default_price: props.body.default_price,
      }),
      ...(props.body.business_status !== undefined && {
        business_status: props.body.business_status,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
    select: {
      id: true,
      business_name: true,
    },
  });
  const categories =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: product.id },
      select: {
        shopping_mall_category_id: true,
      },
    });
  const categoryIds = categories.map((c) => c.shopping_mall_category_id);
  let primary_categories: IShoppingMallCategory.ISummary[] = [];
  if (categoryIds.length > 0) {
    const cats = await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        name: true,
        parent_id: true,
        description: true,
        status: true,
        sort_order: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    primary_categories = cats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id === null ? null : cat.parent_id,
      description: cat.description,
      status: cat.status,
      sort_order: cat.sort_order,
      updated_at: toISOStringSafe(cat.updated_at),
      deleted_at:
        cat.deleted_at === null || cat.deleted_at === undefined
          ? undefined
          : toISOStringSafe(cat.deleted_at),
    }));
  }
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    default_price: updated.default_price,
    business_status: updated.business_status,
    seller: {
      id: seller?.id ?? "",
      business_name: seller?.business_name ?? "",
    },
    primary_categories,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
