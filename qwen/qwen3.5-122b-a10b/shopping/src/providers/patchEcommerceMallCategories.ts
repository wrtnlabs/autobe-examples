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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.body.parent_id },
    });
  }
  const whereInput: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.parent_id !== undefined &&
      (props.body.parent_id === null
        ? { parent_id: null }
        : { parent_id: props.body.parent_id })),
  };
  const orderByInput: Prisma.ecommerce_mall_categoriesOrderByWithRelationInput =
    props.body.sortBy === "name"
      ? { name: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCategoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
