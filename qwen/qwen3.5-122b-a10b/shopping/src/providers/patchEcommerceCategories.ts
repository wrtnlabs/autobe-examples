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
import { EcommerceCategoryAtSummaryTransformer } from "../transformers/EcommerceCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCategories(props: {
  body: IEcommerceCategory.IRequest;
}): Promise<IPageIEcommerceCategory.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        name: {
          contains: props.body.search,
        },
      }),
    ...(props.body.parent_id !== undefined &&
      props.body.parent_id !== null && {
        parent_id: props.body.parent_id,
      }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: {
        gte: new Date(props.body.updated_at_from),
      },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: {
        lte: new Date(props.body.updated_at_to),
      },
    }),
  } satisfies Prisma.ecommerce_categoriesWhereInput;
  const orderByInput: Prisma.ecommerce_categoriesOrderByWithRelationInput =
    props.body.sort_field !== undefined && props.body.sort_field !== null
      ? {
          [props.body.sort_field]:
            props.body.sort_order === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : { created_at: "desc" as const };
  const records = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceCategoryAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.ecommerce_categories.count({
    where: whereInput,
  });
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await EcommerceCategoryAtSummaryTransformer.transformAll(records),
  } satisfies IPageIEcommerceCategory.ISummary;
}
