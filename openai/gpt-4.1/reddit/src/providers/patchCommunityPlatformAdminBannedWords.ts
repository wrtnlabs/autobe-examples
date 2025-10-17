import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { IPageICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedWord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminBannedWords(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedWord.IRequest;
}): Promise<IPageICommunityPlatformBannedWord> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = ["word", "created_at", "updated_at"];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? body.sort!
    : "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Build date filter (created_at)
  let createdAt: { gte?: string; lte?: string } = {};
  if (body.createdFrom !== undefined) createdAt.gte = body.createdFrom;
  if (body.createdTo !== undefined) createdAt.lte = body.createdTo;

  const where = {
    ...(body.active !== undefined && { active: body.active }),
    ...(Object.keys(createdAt).length > 0 && { created_at: createdAt }),
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { word: { contains: body.search } },
            { reason: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_banned_words.findMany({
      where,
      orderBy: {
        [sortField]: order,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_banned_words.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    word: row.word,
    reason: row.reason ?? undefined,
    active: row.active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
