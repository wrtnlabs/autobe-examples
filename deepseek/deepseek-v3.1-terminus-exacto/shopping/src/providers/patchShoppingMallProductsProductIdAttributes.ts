import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function patchShoppingMallProductsProductIdAttributes(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.IRequest;
}): Promise<IPageIShoppingMallProductAttribute.ISummary> {
  // Use productId from path parameter (body.product_id is for override capability)
  const targetProductId = props.body.product_id ?? props.productId;

  // Verify product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: targetProductId },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition
  const whereCondition: Prisma.shopping_mall_product_attributesWhereInput = {
    shopping_mall_product_id: targetProductId,
    deleted_at: null,
  };

  // Add search filter if provided
  if (props.body.search) {
    whereCondition.OR = [
      { attribute_name: { contains: props.body.search, mode: "insensitive" } },
      { attribute_value: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Build orderBy
  const orderBy: Prisma.shopping_mall_product_attributesOrderByWithRelationInput =
    {};
  if (props.body.sort_by) {
    switch (props.body.sort_by) {
      case "attribute_name":
        orderBy.attribute_name = props.body.order ?? "asc";
        break;
      case "attribute_value":
        orderBy.attribute_value = props.body.order ?? "asc";
        break;
      case "display_order":
        orderBy.display_order = props.body.order ?? "asc";
        break;
      case "created_at":
        orderBy.created_at = props.body.order ?? "asc";
        break;
    }
  } else {
    orderBy.display_order = "asc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attributes.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
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
    }),
    MyGlobal.prisma.shopping_mall_product_attributes.count({
      where: whereCondition,
    }),
  ]);

  // Transform data to match API structure
  const transformedData = data.map((attribute) => ({
    id: attribute.id,
    attribute_name: attribute.attribute_name,
    attribute_value: attribute.attribute_value,
    display_order: attribute.display_order,
    created_at: toISOStringSafe(attribute.created_at),
    updated_at: toISOStringSafe(attribute.updated_at),
    deleted_at: attribute.deleted_at
      ? toISOStringSafe(attribute.deleted_at)
      : undefined,
    product: {
      id: attribute.product.id,
      name: attribute.product.name,
      price: attribute.product.price,
      status: attribute.product.status,
      stock_quantity: attribute.product.stock_quantity,
      category: {
        id: attribute.product.category.id,
        name: attribute.product.category.name,
        description: attribute.product.category.description ?? undefined,
        display_order: attribute.product.category.display_order,
        active: attribute.product.category.active,
        parent_id:
          attribute.product.category.parent_id !== null
            ? (attribute.product.category.parent_id satisfies string &
                tags.Format<"uuid"> as string & tags.Format<"uuid">)
            : ("00000000-0000-0000-0000-000000000000" satisfies string &
                tags.Format<"uuid"> as string & tags.Format<"uuid">),
        created_at: toISOStringSafe(attribute.product.category.created_at),
        updated_at: toISOStringSafe(attribute.product.category.updated_at),
        parent: attribute.product.category.parent
          ? {
              id: attribute.product.category.parent.id,
              name: attribute.product.category.parent.name,
              description:
                attribute.product.category.parent.description ?? undefined,
              display_order: attribute.product.category.parent.display_order,
              active: attribute.product.category.parent.active,
              parent_id:
                attribute.product.category.parent.parent_id !== null
                  ? (attribute.product.category.parent
                      .parent_id satisfies string &
                      tags.Format<"uuid"> as string & tags.Format<"uuid">)
                  : ("00000000-0000-0000-0000-000000000000" satisfies string &
                      tags.Format<"uuid"> as string & tags.Format<"uuid">),
              created_at: toISOStringSafe(
                attribute.product.category.parent.created_at,
              ),
              updated_at: toISOStringSafe(
                attribute.product.category.parent.updated_at,
              ),
              parent: undefined,
            }
          : undefined,
      },
      seller: {
        id: attribute.product.seller.id,
        business_name: attribute.product.seller.business_name,
        contact_person: attribute.product.seller.contact_person,
        email: attribute.product.seller.email,
        status: attribute.product.seller.status,
      },
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
