import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function patchShoppingMallMemberProducts(props: {
  member: MemberPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    shopping_mall_seller_id: props.member.id,
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const total = await MyGlobal.prisma.shopping_mall_products.count({ where });
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      is_featured: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: true,
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
    } satisfies Prisma.shopping_mall_productsSelect,
  });
  const data = products.map((p) => {
    const category = {
      id: p.category.id,
      name: p.category.name,
      description: p.category.description,
      slug: p.category.slug,
      visibility: p.category.visibility,
      display_order: p.category.display_order,
      created_at: toISOStringSafe(p.category.created_at),
      updated_at: toISOStringSafe(p.category.updated_at),
      deleted_at: p.category.deleted_at
        ? toISOStringSafe(p.category.deleted_at)
        : null,
      parent_category_id: p.category.parent_category_id,
    } satisfies IShoppingMallCategory.ISummary;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      is_featured: p.is_featured,
      seller: {},
      category,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
    } satisfies IShoppingMallProduct.ISummary;
  });
  const pages = Math.ceil(total / limit);
  const paginationRaw = {
    current: page,
    limit,
    records: total,
    pages: Number.isFinite(pages) ? pages : 0,
  };
  const pagination = typia.assert<IPage.IPagination>(paginationRaw);
  const result = { pagination, data };
  return typia.assert<IPageIShoppingMallProduct.ISummary>(result);
}
