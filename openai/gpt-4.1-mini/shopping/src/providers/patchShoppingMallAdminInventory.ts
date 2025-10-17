import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInventory(props: {
  admin: AdminPayload;
  body: IShoppingMallInventory.IRequest;
}): Promise<IPageIShoppingMallInventory.ISummary> {
  const { admin, body } = props;

  // Extract and set pagination defaults
  const pageRaw = body.page === null || body.page === undefined ? 1 : body.page;
  const limitRaw =
    body.limit === null || body.limit === undefined ? 10 : body.limit;

  // Convert page and limit to plain numbers for prisma calculations
  const page = pageRaw as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = limitRaw as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    deleted_at: null,
    ...(body.shopping_mall_sku_id !== undefined &&
      body.shopping_mall_sku_id !== null && {
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      }),
    ...(body.quantity !== undefined &&
      body.quantity !== null && {
        quantity: body.quantity,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_inventory.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      shopping_mall_sku_id: item.shopping_mall_sku_id as string &
        tags.Format<"uuid">,
      quantity: item.quantity as number & tags.Type<"int32">,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
