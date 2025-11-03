import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { IPageIShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemSetting.IRequest;
}): Promise<IPageIShoppingMallSystemSetting.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereOrConditions = [];
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    whereOrConditions.push(
      { key: { contains: body.search } },
      { value: { contains: body.search } },
      { description: { contains: body.search } },
    );
  }

  const whereConditions: { [key: string]: unknown } = { deleted_at: null };

  if (body.key !== undefined && body.key !== null)
    whereConditions.key = body.key;
  if (body.value !== undefined && body.value !== null)
    whereConditions.value = body.value;

  if (
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
  ) {
    const createdAtCondition: { gte?: string; lt?: string } = {};
    if (body.createdAtFrom !== undefined && body.createdAtFrom !== null)
      createdAtCondition.gte = toISOStringSafe(body.createdAtFrom);
    if (body.createdAtTo !== undefined && body.createdAtTo !== null)
      createdAtCondition.lt = toISOStringSafe(body.createdAtTo);
    whereConditions.created_at = createdAtCondition;
  }

  const where = {
    ...whereConditions,
    ...(whereOrConditions.length > 0 ? { OR: whereOrConditions } : {}),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_settings.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_system_settings.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      description: item.description ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
