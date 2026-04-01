import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberProductsProductId(props: {
  member: MemberPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        code: true,
        name: true,
        description: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (
    product.deleted_at !== null &&
    product.shopping_mall_seller_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: props.productId,
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    shopping_mall_category_id: product.shopping_mall_category_id,
    code: product.code,
    name: product.name,
    description: product.description,
    is_featured: product.is_featured,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at:
      product.deleted_at === null ? null : toISOStringSafe(product.deleted_at),
  } satisfies IShoppingMallProduct;
}
