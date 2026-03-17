import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // Step 1: Find existing product
  const existing =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_id: true,
        seller_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Step 2: Verify product is not soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  // Step 3: Validate category if changing
  if (props.body.categoryId !== undefined) {
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
    });
  }
  // Step 4: Check name uniqueness if name or category changed
  const newName = props.body.name ?? existing.name;
  const newCategoryId = props.body.categoryId ?? existing.category_id;
  if (props.body.name !== undefined || props.body.categoryId !== undefined) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        id: { not: props.productId },
        name: newName,
        category_id: newCategoryId,
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "A product with this name already exists in the target category",
        400,
      );
    }
  }
  // Step 5: Execute in transaction - create snapshot and update
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create snapshot with current state
    await prisma.ecommerce_mall_product_snapshots.create({
      data: {
        id: v4(),
        product_id: existing.id,
        category_id: existing.category_id,
        name: existing.name,
        description: existing.description,
        base_price: existing.base_price,
        created_at: new Date(),
      },
    });
    // Update product
    await prisma.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.categoryId !== undefined && {
          category_id: props.body.categoryId,
        }),
        ...(props.body.basePrice !== undefined && {
          base_price: props.body.basePrice,
        }),
        updated_at: new Date(),
      },
    });
  });
  // Step 6: Fetch updated product with transformer fields
  const updated =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  // Step 7: Transform and return
  return EcommerceMallProductTransformer.transform(updated);
}
