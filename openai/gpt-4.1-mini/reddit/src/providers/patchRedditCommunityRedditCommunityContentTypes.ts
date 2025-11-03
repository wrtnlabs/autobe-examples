import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import { IPageIRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentType";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityRedditCommunityContentTypes(props: {
  body: IRedditCommunityContentType.IRequest;
}): Promise<IPageIRedditCommunityContentType.ISummary> {
  const { body } = props;

  // Normalize pagination parameters
  const page = body.page >= 1 ? body.page : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build where condition for search
  const searchFilter = body.search?.trim();

  const where = searchFilter
    ? {
        OR: [
          { content_type_code: { contains: searchFilter } },
          { content_type_name: { contains: searchFilter } },
        ],
      }
    : {};

  // Build orderBy clause
  const orderField = body.sortBy ?? "content_type_code";
  const orderDirection = body.sortOrder === "desc" ? "desc" : "asc";

  // Prisma doesn't support mode option for string contains to maintain compatibility
  const orderBy = { [orderField]: orderDirection };

  const [items, totalRecords] = await Promise.all([
    MyGlobal.prisma.reddit_community_content_types.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_content_types.count({ where }),
  ]);

  // Calculate total pages
  const pages = Math.max(Math.ceil(totalRecords / limit), 1);

  // Map Prisma result to API DTO
  const data = items.map((item) => ({
    id: item.id,
    content_type_code: item.content_type_code,
    content_type_name: item.content_type_name,
    description: item.description ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages,
    },
    data,
  };
}
