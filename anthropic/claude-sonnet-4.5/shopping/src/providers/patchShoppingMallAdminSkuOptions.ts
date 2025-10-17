import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { IPageIShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSkuOptions(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuOption.IRequest;
}): Promise<IPageIShoppingMallSkuOption> {
  const { admin, body } = props;

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build WHERE clause with optional option_name filter
  const whereCondition = {
    ...(body.option_name !== undefined &&
      body.option_name !== null &&
      body.option_name.length > 0 && {
        option_name: {
          contains: body.option_name,
        },
      }),
  };

  // Execute concurrent queries for data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_options.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sku_options.count({
      where: whereCondition,
    }),
  ]);

  // Map database records to response format
  const data: IShoppingMallSkuOption[] = rows.map((row) => ({
    id: row.id,
    option_name: row.option_name,
    option_value: row.option_value,
  }));

  // Construct pagination metadata
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
