import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Verify parent product exists and belongs to the seller
  const parentProduct = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    include: {
      category: {
        include: {
          parent: true,
        },
      },
      seller: true,
    },
  });

  if (!parentProduct) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Check if SKU already exists for this product
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        sku: props.body.sku,
        deleted_at: null,
      },
    });

  if (existingVariant) {
    throw new HttpException(
      "Variant SKU must be unique within the product",
      400,
    );
  }

  // Create the variant
  const createdVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_id: props.productId,
        variant_name: props.body.variant_name,
        sku: props.body.sku,
        price: props.body.price ?? null,
        stock_quantity: props.body.stock_quantity,
        attributes: props.body.attributes ?? "{}",
        active: props.body.active,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

  // Fetch the complete variant with relations
  const variantWithRelations =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: createdVariant.id },
      include: {
        product: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
            seller: true,
          },
        },
      },
    });

  if (!variantWithRelations || !variantWithRelations.product) {
    throw new HttpException("Failed to create variant", 500);
  }

  const product = variantWithRelations.product;

  // Convert product to summary format
  const productSummary: IShoppingMallProduct.ISummary = {
    id: product.id,
    name: product.name,
    price: product.price,
    status: product.status,
    stock_quantity: product.stock_quantity,
    category: {
      id: product.category.id,
      name: product.category.name,
      description: product.category.description ?? undefined,
      display_order: product.category.display_order,
      active: product.category.active,
      parent_id:
        product.category.parent_id !== null
          ? product.category.parent_id
          : (v4() as string & tags.Format<"uuid">),
      created_at: toISOStringSafe(product.category.created_at),
      updated_at: toISOStringSafe(product.category.updated_at),
      parent: product.category.parent
        ? {
            id: product.category.parent.id,
            name: product.category.parent.name,
            description: product.category.parent.description ?? undefined,
            display_order: product.category.parent.display_order,
            active: product.category.parent.active,
            parent_id:
              product.category.parent.parent_id !== null
                ? product.category.parent.parent_id
                : (v4() as string & tags.Format<"uuid">),
            created_at: toISOStringSafe(product.category.parent.created_at),
            updated_at: toISOStringSafe(product.category.parent.updated_at),
            parent: undefined,
          }
        : undefined,
    },
    seller: {
      id: product.seller.id,
      business_name: product.seller.business_name,
      contact_person: product.seller.contact_person,
      email: product.seller.email,
      status: product.seller.status,
    },
  };

  return {
    id: variantWithRelations.id,
    variant_name: variantWithRelations.variant_name,
    sku: variantWithRelations.sku,
    price:
      variantWithRelations.price === null
        ? undefined
        : variantWithRelations.price,
    stock_quantity: variantWithRelations.stock_quantity,
    attributes: variantWithRelations.attributes ?? undefined,
    active: variantWithRelations.active,
    created_at: toISOStringSafe(variantWithRelations.created_at),
    updated_at: toISOStringSafe(variantWithRelations.updated_at),
    deleted_at:
      variantWithRelations.deleted_at === null
        ? undefined
        : toISOStringSafe(variantWithRelations.deleted_at),
    product: productSummary,
  };
}
