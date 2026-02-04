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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function patchShoppingMallSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSection.IRequest;
}): Promise<IPageIShoppingMallSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build search conditions
  const searchConditions = props.body.search
    ? {
        OR: [
          {
            name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};
  // Define orderBy with ternary - removed 'sort' property from IRequest
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.shopping_mall_sectionsOrderByWithRelationInput;
  // Query the database using transformer's select
  const sections = await MyGlobal.prisma.shopping_mall_sections.findMany({
    where: {
      ...searchConditions,
      deleted_at: null,
    },
    orderBy: orderByInput,
    skip,
    take: limit,
    select: select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_sections.count({
    where: {
      ...searchConditions,
      deleted_at: null,
    },
  });
  // Transform sections using the transformer's exported transform function
  const transformedSections = (await Promise.all(
    sections.map(transform),
  )) as IPageIShoppingMallSection.ISummary["data"];
  return {
    data: transformedSections,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
