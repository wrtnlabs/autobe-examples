import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function postShoppingMallProducts(props: {
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Generate IDs and timestamps upfront as immutable
  const productId = v4();
  const now = toISOStringSafe(new Date());

  // Find a valid seller record by checking unique title per seller enforcement
  // Since we do not accept seller_id in ICreate and no auth, pick the first available seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({});
  if (!seller) {
    throw new HttpException(
      "No sellers are registered. Cannot create product.",
      409,
    );
  }

  // Check unique title per seller (across products that are not deleted)
  const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      shopping_mall_seller_id: seller.id,
      title: props.body.title,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Product title must be unique per seller.", 409);
  }

  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_products.create({
      data: {
        id: productId,
        title: props.body.title,
        description: props.body.description,
        default_price: props.body.default_price,
        shopping_mall_seller_id: seller.id,
        business_status: props.body.business_status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new HttpException("Product title must be unique per seller.", 409);
    }
    throw err;
  }

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    default_price: created.default_price,
    business_status: created.business_status,
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
    primary_categories: [],
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: undefined,
  };
}
