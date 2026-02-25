import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSuperAdministratorAtSummaryTransformer } from "../transformers/EcommerceSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministrators(props: {
  body: IEcommerceSuperAdministrator.IRequest;
}): Promise<IPageIEcommerceSuperAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: props.body.updated_at_start },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: props.body.updated_at_end },
    }),
  } satisfies Prisma.ecommerce_super_administratorsWhereInput;
  // Execute queries
  const data = await MyGlobal.prisma.ecommerce_super_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceSuperAdministratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_super_administrators.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSuperAdministratorAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
