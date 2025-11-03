import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductTag";
import { IPageIShoppingProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProductTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminProductTags(props: {
  admin: AdminPayload;
  body: IShoppingProductTag.IRequest;
}): Promise<IPageIShoppingProductTag.ISummary> {
  const { body } = props;
  const page = body.page !== undefined && body.page > 0 ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;

  const skip = (Number(page) - 1) * Number(limit);
  const allowedSortFields = [
    "tag_code",
    "display_value",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const where = {
    deleted_at: null,
    ...(body.tag_code !== undefined &&
      body.tag_code !== null && { tag_code: body.tag_code }),
    ...(body.display_value !== undefined &&
      body.display_value !== null && { display_value: body.display_value }),
    ...(body.description !== undefined &&
      body.description !== null && { description: body.description }),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { tag_code: { contains: body.search } },
            { display_value: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_product_tags.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_product_tags.count({ where }),
  ]);

  const data = rows.map((row) => {
    const summary: IShoppingProductTag.ISummary = {
      id: row.id,
      tag_code: row.tag_code,
      display_value: row.display_value,
      description: row.description ?? undefined,
    };
    return summary;
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
