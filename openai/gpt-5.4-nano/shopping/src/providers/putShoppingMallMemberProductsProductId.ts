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
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberProductsProductId(props: {
  member: MemberPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // NOTE: placeholder draft
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        code: true,
        name: true,
        description: true,
        is_featured: true,
        updated_at: true,
        created_at: true,
        deleted_at: true,
        seller: { select: { id: true } },
        category: { select: { id: true } },
      },
    });
  if (product.shopping_mall_seller_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.shopping_mall_category_id !== undefined) {
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_category_id },
      select: { id: true },
    });
  }
  const updatedCode = props.body.code ?? product.code;
  const updatedName = props.body.name ?? product.name;
  const updatedDescription = props.body.description ?? product.description;
  const updatedCategoryId =
    props.body.shopping_mall_category_id ?? product.shopping_mall_category_id;
  const updatedIsFeatured = props.body.is_featured ?? product.is_featured;
  try {
    return await MyGlobal.prisma.$transaction(async (tx) => {
      const updatedAtIso = toISOStringSafe(new Date());
      // snapshot not implemented in draft
      await tx.shopping_mall_products.update({
        where: { id: props.productId },
        data: {
          ...(props.body.shopping_mall_category_id !== undefined && {
            shopping_mall_category_id: props.body.shopping_mall_category_id,
          }),
          ...(props.body.code !== undefined && { code: props.body.code }),
          ...(props.body.name !== undefined && { name: props.body.name }),
          ...(props.body.description !== undefined && {
            description: props.body.description,
          }),
          ...(props.body.is_featured !== undefined && {
            is_featured: props.body.is_featured,
          }),
          updated_at: new Date(updatedAtIso),
        },
      });
      const updated = await tx.shopping_mall_products.findUniqueOrThrow({
        where: { id: props.productId },
        ...ShoppingMallProductTransformer.select(),
      });
      return await ShoppingMallProductTransformer.transform(updated);
    });
  } catch (e) {
    throw e;
  }
}
