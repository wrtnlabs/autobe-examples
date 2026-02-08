import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const now = toISOStringSafe(new Date());
  const exists = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      seller_id_name: {
        seller_id: props.seller.id,
        name: (props.body as any).name,
      },
    },
  });
  if (exists)
    throw new HttpException("Product name already exists for this seller", 409);
  const subcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: { id: (props.body as any).product_subcategory_id },
      select: { id: true, deleted_at: true },
    });
  if (!subcategory || subcategory.deleted_at !== null) {
    throw new HttpException("Product subcategory not found or deleted", 404);
  }
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      seller: { connect: { id: props.seller.id } },
      productSubcategory: {
        connect: { id: (props.body as any).product_subcategory_id },
      },
      name: (props.body as any).name,
      description: (props.body as any).description,
      base_price: (props.body as any).base_price,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    seller_id: created.seller_id,
    product_subcategory_id: created.product_subcategory_id,
    name: created.name,
    description: created.description,
    base_price: created.base_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
