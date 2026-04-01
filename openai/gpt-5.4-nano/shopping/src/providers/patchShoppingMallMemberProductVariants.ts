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
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  // Authorization/scoping: member can only see variants whose parent product belongs to the same member as seller.
  const whereInput = {
    deleted_at: null,
    product: {
      shopping_mall_seller_id: props.member.id,
    },
    ...(props.body.shopping_mall_product_id
      ? { shopping_mall_product_id: props.body.shopping_mall_product_id }
      : undefined),
    ...(props.body.is_active === undefined
      ? undefined
      : { is_active: props.body.is_active }),
    ...(props.body.code
      ? { code: { contains: props.body.code, mode: "insensitive" as const } }
      : undefined),
    ...(props.body.title
      ? { title: { contains: props.body.title, mode: "insensitive" as const } }
      : undefined),
    ...(props.body.option_value
      ? {
          option_value: {
            contains: props.body.option_value,
            mode: "insensitive" as const,
          },
        }
      : undefined),
  };
  const orderByInput =
    sort === "created_at"
      ? { created_at: order }
      : sort === "code"
        ? { code: order }
        : sort === "title"
          ? { title: order }
          : sort === "price"
            ? { price: order }
            : { option_value: order };
  const [variants, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
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
                parent_category_id: true,
                name: true,
                description: true,
                slug: true,
                visibility: true,
                display_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({ where: whereInput }),
  ]);
  const data = variants.map((v) => {
    const p = v.product;
    const c = p.category;
    return {
      id: v.id,
      code: v.code,
      title: v.title,
      option_value: v.option_value,
      price: v.price,
      is_active: v.is_active,
      created_at: v.created_at.toISOString(),
      updated_at: v.updated_at.toISOString(),
      deleted_at: v.deleted_at?.toISOString() ?? null,
      product: {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        is_featured: p.is_featured,
        seller: {},
        category: {
          id: c.id,
          parent_category_id: c.parent_category_id,
          name: c.name,
          description: c.description,
          slug: c.slug,
          visibility: c.visibility,
          display_order: c.display_order,
          created_at: c.created_at.toISOString(),
          updated_at: c.updated_at.toISOString(),
          deleted_at: c.deleted_at?.toISOString() ?? null,
        },
        created_at: p.created_at.toISOString(),
        updated_at: p.updated_at.toISOString(),
        deleted_at: p.deleted_at?.toISOString() ?? null,
      },
    } satisfies IShoppingMallProductVariant.ISummary;
  });
  return typia.assert<IPageIShoppingMallProductVariant.ISummary>({
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  });
}
