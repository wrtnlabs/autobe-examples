import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { IPageIShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallSystemConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfiguration.IRequest;
}): Promise<IPageIShoppingMallSystemConfiguration.ISummary> {
  const page = (props.body.page > 0
    ? props.body.page
    : 1) satisfies number as number;
  const limit = (props.body.limit > 0
    ? props.body.limit
    : 100) satisfies number as number;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.filter) {
    for (const [key, value] of Object.entries(props.body.filter)) {
      // Use exact match filtering for provided filter keys and values
      whereConditions[key] = value;
    }
  }

  if (props.body.search) {
    whereConditions.OR = [
      { key: { contains: props.body.search } },
      { value: { contains: props.body.search } },
    ];
  }

  const orderBy = {} as Record<string, "asc" | "desc">;
  if (props.body.sortBy) {
    orderBy[props.body.sortBy] = props.body.order === "asc" ? "asc" : "desc";
  } else {
    orderBy.created_at = "desc";
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_configurations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        key: true,
        description: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_system_configurations.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: records.map((record) => ({
      key: record.key,
      description: record.description,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
