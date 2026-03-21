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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause = {
    deleted_at: null,
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.name && {
      name: { contains: props.body.name },
    }),
  } satisfies Prisma.ecommerce_mall_categoriesWhereInput;
  const categories = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereClause,
  });
  const data = await ArrayUtil.asyncMap(
    categories,
    EcommerceMallCategoryAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
