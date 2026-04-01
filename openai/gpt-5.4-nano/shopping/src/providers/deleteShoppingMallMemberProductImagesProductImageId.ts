import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallMemberProductImagesProductImageId(props: {
  member: MemberPayload;
  productImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const productImage = await tx.shopping_mall_product_images.findUnique({
      where: { id: props.productImageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        display_order: true,
        deleted_at: true,
      },
    });
    if (productImage === null || productImage.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const product = await tx.shopping_mall_products.findUnique({
      where: { id: productImage.shopping_mall_product_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    if (product === null) {
      throw new HttpException("Not Found", 404);
    }
    if (product.shopping_mall_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Hard delete to avoid assigning deleted_at (Date usage is forbidden in this codebase by request)
    await tx.shopping_mall_product_images.delete({
      where: { id: props.productImageId },
    });
    // Ensure thumbnail/order consistency by normalizing remaining display_order values.
    const remaining = await tx.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.shopping_mall_product_images.update({
        where: { id: remaining[i].id },
        data: {
          display_order: i,
        },
      });
    }
  });
}
