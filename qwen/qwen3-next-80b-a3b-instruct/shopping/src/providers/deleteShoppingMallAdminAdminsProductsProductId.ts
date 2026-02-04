import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify admin is super-admin
  if (props.admin.type !== "admin") {
    throw new HttpException(
      "Forbidden - Only super-admins can delete products",
      403,
    );
  }
  // Find product to verify existence
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Perform cascade delete in transaction
  await MyGlobal.prisma.$transaction([
    // Delete all associated product images
    MyGlobal.prisma.shopping_mall_product_images.deleteMany({
      where: { product_id: props.productId },
    }),
    // Delete all inventory records
    MyGlobal.prisma.shopping_mall_inventory_records.deleteMany({
      where: { product_id: props.productId },
    }),
    // Delete all product snapshots
    MyGlobal.prisma.shopping_mall_order_snapshots.deleteMany({
      where: { product_id: props.productId },
    }),
    // Delete the product itself
    MyGlobal.prisma.shopping_mall_products.delete({
      where: { id: props.productId },
    }),
  ]);
  // Success - return void (204 No Content)
  return;
}
