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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // Check seller registration status - must be approved
  const latestRegistration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findFirst({
      where: { seller_id: props.seller.id },
      orderBy: { created_at: "desc" },
    });
  if (latestRegistration === null || latestRegistration.status !== "approved") {
    throw new HttpException("Seller registration is not approved", 403);
  }
  // Verify product exists, is not deleted, and belongs to requesting seller
  const existingProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
      },
    });
  if (existingProduct === null) {
    throw new HttpException("Product not found", 404);
  }
  if (existingProduct.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden - product belongs to another seller",
      403,
    );
  }
  // Validate category if provided
  if (props.body.categoryId !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: { id: props.body.categoryId },
      },
    );
    if (category === null) {
      throw new HttpException("Category not found", 400);
    }
  }
  // Check name uniqueness within target category if name or category changed
  const nameChanged =
    props.body.name !== undefined && props.body.name !== existingProduct.name;
  const categoryChanged =
    props.body.categoryId !== undefined &&
    props.body.categoryId !== existingProduct.category_id;
  if (nameChanged || categoryChanged) {
    const targetCategoryId =
      props.body.categoryId ?? existingProduct.category_id;
    const targetName = props.body.name ?? existingProduct.name;
    const duplicate = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        name: targetName,
        category_id: targetCategoryId,
        id: { not: props.productId },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Product name already exists in this category",
        409,
      );
    }
  }
  // Execute snapshot creation and update in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot of current state before update
    await tx.ecommerce_mall_product_snapshots.create({
      data: {
        id: v4(),
        product_id: existingProduct.id,
        category_id: existingProduct.category_id,
        name: existingProduct.name,
        description: existingProduct.description,
        base_price: existingProduct.base_price,
        created_at: new Date(),
      },
    });
    // Update the product
    await tx.ecommerce_mall_products.update({
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
  // Fetch updated product with all relations for response
  const updatedProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  return await EcommerceMallProductTransformer.transform(updatedProduct);
}
