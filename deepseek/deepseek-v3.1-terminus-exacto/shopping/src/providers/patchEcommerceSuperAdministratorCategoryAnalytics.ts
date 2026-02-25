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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorCategoryAnalytics(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceCategory.IRequest;
}): Promise<IPageIEcommerceCategory.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build base where conditions
  const baseWhere: Prisma.ecommerce_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.category_ids &&
      props.body.category_ids.length > 0 && {
        id: { in: props.body.category_ids },
      }),
  };
  // Get categories with products count
  const categories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: baseWhere,
    skip,
    take: limit,
    include: {
      products: {
        where: { deleted_at: null },
        select: { id: true },
      },
      parent: {
        select: {
          id: true,
          name: true,
          created_at: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_categories.count({
    where: baseWhere,
  });
  // Process each category manually to match ISummary structure
  const data = categories.map((category) => {
    const parentSummary = category.parent
      ? ({
          id: category.parent.id as string & tags.Format<"uuid">,
          name: category.parent.name,
          parent: null,
          products_count: 0,
          created_at: category.parent.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceCategory.ISummary)
      : null;
    return {
      id: category.id as string & tags.Format<"uuid">,
      name: category.name,
      parent: parentSummary,
      products_count: category.products.length,
      created_at: category.created_at.toISOString() as string &
        tags.Format<"date-time">,
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
