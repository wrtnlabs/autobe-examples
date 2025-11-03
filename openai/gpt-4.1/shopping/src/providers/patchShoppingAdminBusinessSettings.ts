import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";
import { IPageIShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingBusinessSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminBusinessSettings(props: {
  admin: AdminPayload;
  body: IShoppingBusinessSetting.IRequest;
}): Promise<IPageIShoppingBusinessSetting.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = (page - 1) * pageSize;
  const orderByField = body.sort_by ?? "created_at";
  const orderByDir = body.sort_order ?? "desc";

  const where = {
    ...(body.setting_key !== undefined && {
      setting_key: {
        contains: body.setting_key,
      },
    }),
    ...(body.setting_value !== undefined && {
      setting_value: {
        contains: body.setting_value,
      },
    }),
    ...(body.description !== undefined && {
      description: {
        contains: body.description,
      },
    }),
    ...(body.created_before !== undefined && {
      created_at: { lte: body.created_before },
    }),
    ...(body.created_after !== undefined && {
      created_at: { gte: body.created_after },
    }),
    ...(body.updated_before !== undefined && {
      updated_at: { lte: body.updated_before },
    }),
    ...(body.updated_after !== undefined && {
      updated_at: { gte: body.updated_after },
    }),
  };

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_business_settings.count({ where }),
    MyGlobal.prisma.shopping_business_settings.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: pageSize,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    setting_key: row.setting_key,
    setting_value: row.setting_value,
    description: row.description ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  const pagination = {
    current: Number(page),
    limit: Number(pageSize),
    records: total,
    pages: Math.ceil(total / Number(pageSize)),
  };

  return { pagination, data };
}
