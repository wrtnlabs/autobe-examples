import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists - throws 404 if not found
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Soft delete all wishlist items referencing this product
  await MyGlobal.prisma.shopping_mall_wishlist_items.updateMany({
    where: { shopping_mall_product_id: props.productId },
    data: { deleted_at: new Date() },
  });
  // Soft delete the product - cascade handles variants and inventory records
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
}
