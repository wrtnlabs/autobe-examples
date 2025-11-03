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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingProduct.IUpdate;
}): Promise<IShoppingProduct> {
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
  });
  if (!product || product.deleted_at) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  const updated = await MyGlobal.prisma.shopping_products.update({
    where: { id: product.id },
    data: {
      ...(typeof props.body.name !== "undefined"
        ? { name: props.body.name }
        : {}),
      ...(typeof props.body.description !== "undefined"
        ? { description: props.body.description }
        : {}),
      ...(typeof props.body.main_image_uri !== "undefined"
        ? { main_image_uri: props.body.main_image_uri }
        : {}),
      ...(typeof props.body.status !== "undefined"
        ? { status: props.body.status }
        : {}),
      ...(typeof props.body.business_status !== "undefined"
        ? { business_status: props.body.business_status }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: updated.shopping_seller_id },
  });
  const catAssignments =
    await MyGlobal.prisma.shopping_category_product_assignments.findMany({
      where: { shopping_product_id: updated.id },
      include: { category: true },
    });
  const skus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { shopping_product_id: updated.id, deleted_at: null },
  });
  const images = await MyGlobal.prisma.shopping_product_images.findMany({
    where: { shopping_product_id: updated.id },
    orderBy: { order_index: "asc" },
  });
  const tagAssigns =
    await MyGlobal.prisma.shopping_product_tag_assignments.findMany({
      where: { shopping_product_id: updated.id },
      include: { tag: true },
    });
  const attrs = await MyGlobal.prisma.shopping_product_attributes.findMany({
    where: { shopping_product_id: updated.id },
    include: { attributeValue: { include: { attributeDimension: true } } },
  });
  return {
    id: updated.id,
    shopping_seller_id: updated.shopping_seller_id,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    main_image_uri:
      typeof updated.main_image_uri !== "undefined" &&
      updated.main_image_uri !== null
        ? updated.main_image_uri
        : undefined,
    status: updated.status,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    seller: seller
      ? {
          id: seller.id,
          display_name: seller.display_name,
          status: seller.status,
        }
      : { id: updated.shopping_seller_id, display_name: "", status: "" },
    categories: catAssignments.map((a) => ({
      id: a.category.id,
      category_code: a.category.category_code,
      category_name: a.category.category_name,
    })),
    skus: skus.map((sku) => ({
      id: sku.id,
      shopping_product_id: sku.shopping_product_id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      barcode:
        typeof sku.barcode !== "undefined" && sku.barcode !== null
          ? sku.barcode
          : undefined,
      status: sku.status,
      created_at: toISOStringSafe(sku.created_at),
      updated_at: toISOStringSafe(sku.updated_at),
      deleted_at:
        typeof sku.deleted_at !== "undefined" && sku.deleted_at !== null
          ? toISOStringSafe(sku.deleted_at)
          : undefined,
      variant_attributes: [],
      product: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        main_image_uri:
          typeof updated.main_image_uri !== "undefined" &&
          updated.main_image_uri !== null
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
        typeof img.order_index !== "undefined" && img.order_index !== null
          ? img.order_index
          : undefined,
      created_at: toISOStringSafe(img.created_at),
    })),
    tags: tagAssigns.map((ta) => ({
      id: ta.tag.id,
      tag_code: ta.tag.tag_code,
      display_value: ta.tag.display_value,
    })),
    attributes: attrs.map((pa) => ({
      id: pa.id,
      attribute_dimension: {
        id: pa.attributeValue.attributeDimension.id,
        dimension_code: pa.attributeValue.attributeDimension.dimension_code,
        name: pa.attributeValue.attributeDimension.name,
        description:
          typeof pa.attributeValue.attributeDimension.description !==
            "undefined" &&
          pa.attributeValue.attributeDimension.description !== null
            ? pa.attributeValue.attributeDimension.description
            : undefined,
      },
      attribute_value: {
        id: pa.attributeValue.id,
        value_code: pa.attributeValue.value_code,
        display_value: pa.attributeValue.display_value,
        dimension: {
          id: pa.attributeValue.attributeDimension.id,
          dimension_code: pa.attributeValue.attributeDimension.dimension_code,
          name: pa.attributeValue.attributeDimension.name,
          description:
            typeof pa.attributeValue.attributeDimension.description !==
              "undefined" &&
            pa.attributeValue.attributeDimension.description !== null
              ? pa.attributeValue.attributeDimension.description
              : undefined,
        },
      },
    })),
  };
}
