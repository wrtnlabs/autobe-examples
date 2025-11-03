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

export async function getShoppingProductsProductCode(props: {
  productCode: string;
}): Promise<IShoppingProduct> {
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
    select: {
      id: true,
      shopping_seller_id: true,
      code: true,
      name: true,
      description: true,
      main_image_uri: true,
      status: true,
      business_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.status !== "active" || product.business_status !== "approved") {
    throw new HttpException("Product not found", 404);
  }
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: product.shopping_seller_id },
    select: { id: true, display_name: true, status: true },
  });
  if (!seller)
    throw new HttpException("Seller does not exist for product", 500);
  const categoryAssignments =
    await MyGlobal.prisma.shopping_category_product_assignments.findMany({
      where: { shopping_product_id: product.id },
      select: { shopping_category_id: true },
    });
  const categories =
    categoryAssignments.length > 0
      ? await MyGlobal.prisma.shopping_categories.findMany({
          where: {
            id: { in: categoryAssignments.map((a) => a.shopping_category_id) },
          },
          select: { id: true, category_code: true, category_name: true },
        })
      : [];
  const imagesRaw = await MyGlobal.prisma.shopping_product_images.findMany({
    where: { shopping_product_id: product.id },
    select: {
      id: true,
      shopping_product_id: true,
      image_uri: true,
      order_index: true,
      created_at: true,
    },
    orderBy: [{ order_index: "asc" }, { created_at: "asc" }],
  });
  const images = imagesRaw.map((img) => ({
    id: img.id,
    shopping_product_id: img.shopping_product_id,
    image_uri: img.image_uri,
    order_index:
      img.order_index !== null && img.order_index !== undefined
        ? img.order_index
        : undefined,
    created_at: toISOStringSafe(img.created_at),
  }));
  const skuRows = await MyGlobal.prisma.shopping_skus.findMany({
    where: { shopping_product_id: product.id },
    orderBy: [{ created_at: "asc" }],
  });
  const skuIds = skuRows.map((sku) => sku.id);
  let skuImagesMap: Record<string, IShoppingSkuImage[]> = {};
  if (skuIds.length) {
    const skuImagesRaw = await MyGlobal.prisma.shopping_sku_images.findMany({
      where: { shopping_sku_id: { in: skuIds } },
      orderBy: [{ created_at: "asc" }],
    });
    for (const img of skuImagesRaw) {
      skuImagesMap[img.shopping_sku_id] =
        skuImagesMap[img.shopping_sku_id] || [];
      skuImagesMap[img.shopping_sku_id].push({
        id: img.id,
        shopping_sku_id: img.shopping_sku_id,
        image_uri: img.image_uri,
        created_at: toISOStringSafe(img.created_at),
      });
    }
  }
  let skuVariantsMap: Record<string, IShoppingSkuVariant[]> = {};
  if (skuIds.length) {
    const skuVariants = await MyGlobal.prisma.shopping_sku_variants.findMany({
      where: { shopping_sku_id: { in: skuIds } },
      orderBy: [{ order_index: "asc" }],
    });
    const attrValueIds = skuVariants.map((v) => v.shopping_attribute_value_id);
    const attrValues = attrValueIds.length
      ? await MyGlobal.prisma.shopping_attribute_values.findMany({
          where: { id: { in: attrValueIds } },
          select: {
            id: true,
            shopping_attribute_dimension_id: true,
            value_code: true,
            display_value: true,
            display_order: true,
            created_at: true,
          },
        })
      : [];
    const attrDimensionIds = attrValues.map(
      (a) => a.shopping_attribute_dimension_id,
    );
    const dimensions = attrDimensionIds.length
      ? await MyGlobal.prisma.shopping_attribute_dimensions.findMany({
          where: { id: { in: attrDimensionIds } },
          select: {
            id: true,
            dimension_code: true,
            name: true,
            description: true,
          },
        })
      : [];
    const dimById: Record<string, (typeof dimensions)[number]> = {};
    for (const d of dimensions) dimById[d.id] = d;
    const attrValueById: Record<string, (typeof attrValues)[number]> = {};
    for (const v of attrValues) attrValueById[v.id] = v;
    for (const v of skuVariants) {
      const attrVal = attrValueById[v.shopping_attribute_value_id];
      const dim = attrVal
        ? dimById[attrVal.shopping_attribute_dimension_id]
        : undefined;
      skuVariantsMap[v.shopping_sku_id] =
        skuVariantsMap[v.shopping_sku_id] || [];
      skuVariantsMap[v.shopping_sku_id].push({
        id: v.id,
        shopping_attribute_value_id: v.shopping_attribute_value_id,
        order_index: v.order_index,
        attribute_value:
          attrVal && dim
            ? {
                id: attrVal.id,
                shopping_attribute_dimension_id:
                  attrVal.shopping_attribute_dimension_id,
                value_code: attrVal.value_code,
                display_value: attrVal.display_value,
                display_order:
                  attrVal.display_order !== null &&
                  attrVal.display_order !== undefined
                    ? attrVal.display_order
                    : undefined,
                created_at: toISOStringSafe(attrVal.created_at),
              }
            : {
                id: "",
                shopping_attribute_dimension_id: "",
                value_code: "",
                display_value: "",
                display_order: undefined,
                created_at: toISOStringSafe(new Date()),
              },
      });
    }
  }
  const skuSummary: IShoppingProduct.ISummary = {
    id: product.id,
    code: product.code,
    name: product.name,
    status: product.status,
    main_image_uri:
      product.main_image_uri !== null && product.main_image_uri !== undefined
        ? product.main_image_uri
        : undefined,
  };
  const skus: IShoppingSku[] = skuRows.map((sku) => ({
    id: sku.id,
    shopping_product_id: sku.shopping_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    barcode:
      sku.barcode !== null && sku.barcode !== undefined
        ? sku.barcode
        : undefined,
    status: sku.status,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at:
      sku.deleted_at !== null && sku.deleted_at !== undefined
        ? toISOStringSafe(sku.deleted_at)
        : undefined,
    variant_attributes: skuVariantsMap[sku.id] || [],
    product: skuSummary,
    images: skuImagesMap[sku.id] || [],
  }));
  const tagAssignments =
    await MyGlobal.prisma.shopping_product_tag_assignments.findMany({
      where: { shopping_product_id: product.id },
      select: { shopping_product_tag_id: true },
    });
  const tagIds = tagAssignments.map((t) => t.shopping_product_tag_id);
  const tags = tagIds.length
    ? await MyGlobal.prisma.shopping_product_tags.findMany({
        where: { id: { in: tagIds } },
        select: { id: true, tag_code: true, display_value: true },
      })
    : [];
  const tagSummaries: IShoppingTag.ISummary[] = tags.map((tag) => ({
    id: tag.id,
    tag_code: tag.tag_code,
    display_value: tag.display_value,
  }));
  const attrAssignments =
    await MyGlobal.prisma.shopping_product_attributes.findMany({
      where: { shopping_product_id: product.id },
      select: { id: true, shopping_attribute_value_id: true },
    });
  let attrValues2: Array<{
    id: string;
    shopping_attribute_dimension_id: string;
    value_code: string;
    display_value: string;
    display_order: number | null;
    created_at: Date;
  }> = [];
  let dimensions2: Array<{
    id: string;
    dimension_code: string;
    name: string;
    description: string | null;
  }> = [];
  if (attrAssignments.length) {
    const attrValueIds2 = attrAssignments.map(
      (a) => a.shopping_attribute_value_id,
    );
    attrValues2 = await MyGlobal.prisma.shopping_attribute_values.findMany({
      where: { id: { in: attrValueIds2 } },
      select: {
        id: true,
        shopping_attribute_dimension_id: true,
        value_code: true,
        display_value: true,
        display_order: true,
        created_at: true,
      },
    });
    const attrDimensionIds2 = attrValues2.map(
      (a) => a.shopping_attribute_dimension_id,
    );
    dimensions2 = attrDimensionIds2.length
      ? await MyGlobal.prisma.shopping_attribute_dimensions.findMany({
          where: { id: { in: attrDimensionIds2 } },
          select: {
            id: true,
            dimension_code: true,
            name: true,
            description: true,
          },
        })
      : [];
  }
  const dimById2: Record<string, (typeof dimensions2)[number]> = {};
  for (const d of dimensions2 as any[]) dimById2[d.id] = d;
  const attrValueById2: Record<string, (typeof attrValues2)[number]> = {};
  for (const v of attrValues2 as any[]) attrValueById2[v.id] = v;
  const attributes: IShoppingProductAttribute[] = attrAssignments.map((a) => {
    const attrVal = attrValueById2[a.shopping_attribute_value_id];
    const dim = attrVal
      ? dimById2[attrVal.shopping_attribute_dimension_id]
      : undefined;
    return {
      id: a.id,
      attribute_dimension: dim
        ? {
            id: dim.id,
            dimension_code: dim.dimension_code,
            name: dim.name,
            description:
              dim.description !== null && dim.description !== undefined
                ? dim.description
                : undefined,
          }
        : { id: "", dimension_code: "", name: "", description: undefined },
      attribute_value: attrVal
        ? {
            id: attrVal.id,
            value_code: attrVal.value_code,
            display_value: attrVal.display_value,
            dimension: dim
              ? {
                  id: dim.id,
                  dimension_code: dim.dimension_code,
                  name: dim.name,
                  description:
                    dim.description !== null && dim.description !== undefined
                      ? dim.description
                      : undefined,
                }
              : {
                  id: "",
                  dimension_code: "",
                  name: "",
                  description: undefined,
                },
          }
        : {
            id: "",
            value_code: "",
            display_value: "",
            dimension: {
              id: "",
              dimension_code: "",
              name: "",
              description: undefined,
            },
          },
    };
  });
  const sellerSummary: IShoppingSeller.ISummary = {
    id: seller.id,
    display_name: seller.display_name,
    status: seller.status,
  };
  return {
    id: product.id,
    shopping_seller_id: product.shopping_seller_id,
    code: product.code,
    name: product.name,
    description: product.description,
    main_image_uri:
      product.main_image_uri !== null && product.main_image_uri !== undefined
        ? product.main_image_uri
        : undefined,
    status: product.status,
    business_status: product.business_status,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at:
      product.deleted_at !== null && product.deleted_at !== undefined
        ? toISOStringSafe(product.deleted_at)
        : undefined,
    seller: sellerSummary,
    categories: categories.map((cat) => ({
      id: cat.id,
      category_code: cat.category_code,
      category_name: cat.category_name,
    })),
    skus,
    images,
    tags: tagSummaries,
    attributes,
  };
}
