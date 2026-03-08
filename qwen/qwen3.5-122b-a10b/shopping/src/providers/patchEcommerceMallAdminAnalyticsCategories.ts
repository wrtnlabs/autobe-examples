import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoryAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategoryAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoryAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAnalyticsCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategoryAnalytic.IRequest;
}): Promise<IPageIEcommerceMallCategoryAnalytic.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_categoriesWhereInput = {
    ...(props.body.include_deleted !== true && {
      deleted_at: null,
    }),
    ...(props.body.search && {
      OR: [
        {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.parent_category_id && {
      parent_id: props.body.parent_category_id,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereInput,
  });
  // Get product counts using groupBy for efficiency
  const productCounts = await MyGlobal.prisma.ecommerce_mall_products.groupBy({
    by: ["category_id"],
    where: {
      deleted_at: null,
    },
    _count: {
      _all: true,
    },
    _min: {
      status: true,
    },
  });
  // Create a map of category_id to counts
  const countMap = new Map<
    string,
    {
      total: number;
      active: number;
    }
  >();
  for (const pc of productCounts) {
    const activeCount = await MyGlobal.prisma.ecommerce_mall_products.count({
      where: {
        category_id: pc.category_id,
        status: "active",
        deleted_at: null,
      },
    });
    countMap.set(pc.category_id, {
      total: pc._count._all,
      active: activeCount,
    });
  }
  // Query categories with parent relation
  const categories = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent: {
        select: {
          id: true,
          name: true,
          created_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
    },
  });
  // Transform categories to analytics summary
  const data = await Promise.all(
    categories.map(async (category) => {
      const counts = countMap.get(category.id) ?? { total: 0, active: 0 };
      const parentSummary = category.parent
        ? await EcommerceMallCategoryAtSummaryTransformer.transform({
            id: category.parent.id,
            name: category.parent.name,
            created_at: category.parent.created_at,
            deleted_at: category.parent.deleted_at,
            parent: null,
          } as any)
        : null;
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        parent: parentSummary,
        total_product_count: counts.total,
        active_product_count: counts.active,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
        deleted_at: category.deleted_at
          ? toISOStringSafe(category.deleted_at)
          : null,
      } satisfies IEcommerceMallCategoryAnalytic.ISummary;
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
