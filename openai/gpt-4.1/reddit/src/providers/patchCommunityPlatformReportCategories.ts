import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformReportCategories(props: {
  body: ICommunityPlatformReportCategory.IRequest;
}): Promise<IPageICommunityPlatformReportCategory> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search = props.body.search ?? undefined;
  const sortBy = props.body.sortBy ?? "name";
  const order = props.body.order ?? "asc";

  const skip = (page - 1) * limit;

  const where = {
    ...(search !== undefined &&
      search.length > 0 && {
        name: { contains: search },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_report_categories.findMany({
      where,
      orderBy: {
        [sortBy]: order,
      },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        allow_free_text: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_report_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      allow_free_text: row.allow_free_text,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
