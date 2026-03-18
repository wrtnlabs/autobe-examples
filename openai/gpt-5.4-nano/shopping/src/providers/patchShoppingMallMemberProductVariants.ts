import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberProductVariants(props: {
  member: MemberPayload;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const whereInput = {
    deleted_at: null,
    ...(props.body.shopping_mall_product_id
      ? { shopping_mall_product_id: props.body.shopping_mall_product_id }
      : {}),
    ...(props.body.is_active !== undefined
      ? { is_active: props.body.is_active }
      : {}),
    ...(props.body.code
      ? { code: { contains: props.body.code, mode: "insensitive" } }
      : {}),
    ...(props.body.title
      ? { title: { contains: props.body.title, mode: "insensitive" } }
      : {}),
    ...(props.body.option_value
      ? {
          option_value: {
            contains: props.body.option_value,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.shopping_mall_product_id
      ? {
          product: {
            deleted_at: null,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  const orderByInput =
    sort === "created_at"
      ? ({
          created_at: order,
        } satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput)
      : sort === "code"
        ? ({
            code: order,
          } satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput)
        : sort === "title"
          ? ({
              title: order,
            } satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput)
          : sort === "price"
            ? ({
                price: order,
              } satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput)
            : ({
                option_value: order,
              } satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput);
  const items = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      code: true,
      title: true,
      option_value: true,
      price: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          is_featured: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              slug: true,
              visibility: true,
              display_order: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              parent_category_id: true,
            },
          },
        },
      },
    },
  });
  const records = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: whereInput,
  });
  return {
    data: items.map(
      (v) =>
        ({
          id: v.id,
          code: v.code,
          title: v.title,
          option_value: v.option_value,
          price: v.price,
          is_active: v.is_active,
          created_at: toISOStringSafe(v.created_at),
          updated_at: toISOStringSafe(v.updated_at),
          deleted_at:
            v.deleted_at === null ? null : toISOStringSafe(v.deleted_at),
          product: {
            id: v.product.id,
            code: v.product.code,
            name: v.product.name,
            description: v.product.description,
            is_featured: v.product.is_featured,
            seller: {} satisfies IShoppingMallMember.ISummary,
            category: {
              id: v.product.category.id,
              name: v.product.category.name,
              description: v.product.category.description,
              slug: v.product.category.slug,
              visibility: v.product.category.visibility,
              display_order: v.product.category.display_order,
              created_at: toISOStringSafe(v.product.category.created_at),
              updated_at: toISOStringSafe(v.product.category.updated_at),
              deleted_at:
                v.product.category.deleted_at === null
                  ? null
                  : toISOStringSafe(v.product.category.deleted_at),
              parent_category_id: v.product.category.parent_category_id,
            } satisfies IShoppingMallCategory.ISummary,
            created_at: toISOStringSafe(v.product.created_at),
            updated_at: toISOStringSafe(v.product.updated_at),
            deleted_at:
              v.product.deleted_at === null
                ? null
                : toISOStringSafe(v.product.deleted_at),
          } satisfies IShoppingMallProduct.ISummary,
        }) satisfies IShoppingMallProductVariant.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
