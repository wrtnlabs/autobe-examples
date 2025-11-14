import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import { IPageIPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumCitizen";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticalForumModeratorUsers(props: {
  moderator: ModeratorPayload;
  body: IPoliticalForumCitizen.IRequest;
}): Promise<IPageIPoliticalForumCitizen.ISummary> {
  const {
    keyword,
    emailDomain,
    status,
    registeredSince,
    registeredUntil,
    lastLoginSince,
    lastLoginUntil,
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = props.body;

  // Build dynamic where clause based on actual Prisma model fields
  // NOTE: political_forum_citizens has: id, email, password_hash, display_name, created_at, updated_at, deleted_at, email_verified
  // No 'suspended' field - map status 'suspended' to 'deleted_at' !== null
  // No 'last_login' field - ignore lastLoginSince/lastLoginUntil or Prisma will ignore them

  const where = {
    deleted_at: null,
    ...(keyword && {
      OR: [
        {
          display_name: {
            contains: keyword,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        },
        {
          email: {
            contains: keyword,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        },
      ],
    }),
    ...(emailDomain && { email: { endsWith: "@" + emailDomain } }),
    ...(status === "active" && { deleted_at: null }),
    ...(status === "inactive" && { deleted_at: { not: null } }),
    ...(status === "suspended" && { deleted_at: { not: null } }),
    ...(status === "verified" && { email_verified: true }),
    ...(status === "unverified" && { email_verified: false }),
    ...(registeredSince && { created_at: { gte: registeredSince } }),
    ...(registeredUntil && { created_at: { lte: registeredUntil } }),
  };

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.political_forum_citizens.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
      select: {
        id: true,
        display_name: true,
        email: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.political_forum_citizens.count({ where }),
  ]);

  // Convert Date objects to ISO strings
  const formattedData = data.map((citizen) => ({
    ...citizen,
    created_at: toISOStringSafe(citizen.created_at),
    updated_at: toISOStringSafe(citizen.updated_at),
  }));

  // Return as JSON string per IPageIPoliticalForumCitizen.ISummary definition
  return JSON.stringify({
    data: formattedData,
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
  });
}
