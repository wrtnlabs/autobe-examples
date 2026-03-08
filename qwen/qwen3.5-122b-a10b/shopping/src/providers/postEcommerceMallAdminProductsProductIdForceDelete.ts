import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminProductsProductIdForceDelete(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IForceDelete;
}): Promise<IEcommerceMallProduct.ISummary> {
  // Verify product exists and is not already deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted", 400);
  }
  // Get current product data for snapshot
  const currentProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  // Update product to deleted status
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: {
      status: "deleted",
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Create product snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_products_id: props.productId,
      ecommerce_mall_sellers_id: props.admin.id,
      previous_values: JSON.stringify({
        name: currentProduct.name,
        description: currentProduct.description,
        base_price: currentProduct.base_price,
        status: currentProduct.status,
        category_id: currentProduct.category_id,
      }),
      current_values: JSON.stringify({
        name: currentProduct.name,
        description: currentProduct.description,
        base_price: currentProduct.base_price,
        status: "deleted",
        category_id: currentProduct.category_id,
        deleted_at: toISOStringSafe(new Date()),
        deleted_by: props.admin.id,
        violation_reason: props.body.reason,
      }),
      created_at: new Date(),
    },
  });
  // Fetch the deleted product with all relations for response
  const deletedProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductAtSummaryTransformer.select(),
    });
  return await EcommerceMallProductAtSummaryTransformer.transform(
    deletedProduct,
  );
}
