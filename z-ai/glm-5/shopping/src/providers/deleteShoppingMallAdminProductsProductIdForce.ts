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

export async function deleteShoppingMallAdminProductsProductIdForce(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the product (throws 404 if not found)
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, deleted_at: true },
    });
  // Check if already deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted", 400);
  }
  // Soft delete the product
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
  // Create audit log entry
  // Note: IP address would typically be extracted from request context
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action: "product_force_delete",
      target_type: "product",
      target_id: props.productId,
      details: JSON.stringify({
        force_delete: true,
        deleted_at: new Date().toISOString(),
      }),
      ip: "0.0.0.0",
      created_at: new Date(),
    },
  });
}
