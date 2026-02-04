import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSectionAtSummaryTransformer } from "../transformers/ShoppingMallSectionAtSummaryTransformer";

export async function patchShoppingMallAdminSections(props: {
  admin: AdminPayload;
  body: IShoppingMallSection.IRequest;
}): Promise<IPageIShoppingMallSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const searchCondition = props.body.search
    ? {
        OR: [
          { name: { contains: props.body.search } },
          { description: { contains: props.body.search } },
        ],
      }
    : {};
  const data = await MyGlobal.prisma.shopping_mall_sections.findMany({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...ShoppingMallSectionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sections.count({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSectionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
