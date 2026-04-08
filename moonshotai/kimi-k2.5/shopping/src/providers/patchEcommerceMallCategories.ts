import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallCategoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_categories.count({ where }),
  ]);
  return {
    data: await EcommerceMallCategoryAtSummaryTransformer.transformAll(data),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
