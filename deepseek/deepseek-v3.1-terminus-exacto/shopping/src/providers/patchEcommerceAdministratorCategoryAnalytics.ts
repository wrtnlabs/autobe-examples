import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorCategoryAnalytics(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCategory.IRequest;
}): Promise<IPageIEcommerceCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build category where conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.category_ids &&
      props.body.category_ids.length > 0 && {
        id: { in: props.body.category_ids },
      }),
  } satisfies Prisma.ecommerce_categoriesWhereInput;
  // Get categories with product count
  const categories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: whereInput,
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          created_at: true,
        },
      },
      products: {
        where: { deleted_at: null },
        select: {
          id: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_categories.count({
    where: whereInput,
  });
  // Transform categories with product count
  const data = categories.map((category) => {
    const productsCount = category.products?.length ?? 0;
    return {
      id: category.id as string & tags.Format<"uuid">,
      name: category.name,
      parent: category.parent
        ? ({
            id: category.parent.id as string & tags.Format<"uuid">,
            name: category.parent.name,
            parent: null,
            products_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
            created_at: toISOStringSafe(category.parent.created_at),
          } satisfies IEcommerceCategory.ISummary)
        : null,
      products_count: productsCount as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      created_at: toISOStringSafe(category.created_at),
    } satisfies IEcommerceCategory.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceCategory.ISummary;
}
