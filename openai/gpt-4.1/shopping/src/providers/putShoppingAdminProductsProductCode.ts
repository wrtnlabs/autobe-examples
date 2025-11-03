import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";
import { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingProduct.IUpdate;
}): Promise<IShoppingProduct> {
  const { productCode, body } = props;
  // Find product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: productCode },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Perform update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_products.update({
    where: { id: product.id },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      main_image_uri: body.main_image_uri ?? undefined,
      status: body.status ?? undefined,
      business_status: body.business_status ?? undefined,
      updated_at: now,
    },
  });
  // Fetch related data
  const [seller, categories, skus, images, tags, attributes] =
    await Promise.all([
      MyGlobal.prisma.shopping_sellers.findUniqueOrThrow({
        where: { id: updated.shopping_seller_id },
      }),
      MyGlobal.prisma.shopping_category_product_assignments.findMany({
        where: { shopping_product_id: updated.id },
        include: {
          category: true,
        },
      }),
      MyGlobal.prisma.shopping_skus.findMany({
        where: { shopping_product_id: updated.id, deleted_at: null },
      }),
      MyGlobal.prisma.shopping_product_images.findMany({
        where: { shopping_product_id: updated.id },
        orderBy: { order_index: "asc" },
      }),
      MyGlobal.prisma.shopping_product_tag_assignments.findMany({
        where: { shopping_product_id: updated.id },
        include: { tag: true },
      }),
      MyGlobal.prisma.shopping_product_attributes.findMany({
        where: { shopping_product_id: updated.id },
      }),
    ]);
  return {
    id: updated.id,
    shopping_seller_id: updated.shopping_seller_id,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    main_image_uri:
      typeof updated.main_image_uri === "string"
        ? updated.main_image_uri
        : undefined,
    status: updated.status,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    categories: categories.map((ca) => ({
      id: ca.category.id,
      category_code: ca.category.category_code,
      category_name: ca.category.category_name,
    })),
    skus: skus.map((sku) => ({
      id: sku.id,
      shopping_product_id: sku.shopping_product_id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      barcode: typeof sku.barcode === "string" ? sku.barcode : undefined,
      status: sku.status,
      created_at: toISOStringSafe(sku.created_at),
      updated_at: toISOStringSafe(sku.updated_at),
      deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
      variant_attributes: [],
      product: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        main_image_uri:
          typeof updated.main_image_uri === "string"
            ? updated.main_image_uri
            : undefined,
        status: updated.status,
      },
      images: [],
    })),
    images: images.map((img) => ({
      id: img.id,
      shopping_product_id: img.shopping_product_id,
      image_uri: img.image_uri,
      order_index:
        typeof img.order_index === "number" ? img.order_index : undefined,
      created_at: toISOStringSafe(img.created_at),
    })),
    tags: tags.map((t) => ({
      id: t.tag.id,
      tag_code: t.tag.tag_code,
      display_value: t.tag.display_value,
    })),
    attributes: attributes.map((attr) => ({
      id: attr.id,
      attribute_dimension: {
        id: attr.shopping_attribute_value_id,
        dimension_code: "",
        name: "",
        description: undefined,
      },
      attribute_value: {
        id: attr.shopping_attribute_value_id,
        value_code: "",
        display_value: "",
        dimension: {
          id: "",
          dimension_code: "",
          name: "",
        },
      },
    })),
  };
}
