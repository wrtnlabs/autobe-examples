import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunityBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const body = props.body;
  // Construct the where clause from properties in body using optional chaining
  const where: Prisma.community_platform_community_banned_usersWhereInput = {
    deleted_at: null,
  };
  if ((body as any)?.communityId !== undefined) {
    where.community_id = (body as any).communityId;
  }
  if ((body as any)?.userId !== undefined) {
    where.user_id = (body as any).userId;
  }
  const banStatus = (body as any)?.banStatus;
  if (banStatus === "banned") {
    where.unbanned_at = null;
  } else if (banStatus === "unbanned") {
    where.unbanned_at = { not: null };
  }
  if (
    (body as any)?.banAtFrom !== undefined ||
    (body as any)?.banAtTo !== undefined
  ) {
    where.banned_at = {};
    if ((body as any)?.banAtFrom !== undefined) {
      where.banned_at.gte = (body as any).banAtFrom;
    }
    if ((body as any)?.banAtTo !== undefined) {
      where.banned_at.lte = (body as any).banAtTo;
    }
  }
  // Fix unbanned_at filter to be of correct type
  let unbannedAtFilter: Prisma.DateTimeNullableFilter | undefined;
  if (
    typeof where.unbanned_at === "object" &&
    where.unbanned_at !== null &&
    !(where.unbanned_at instanceof Date)
  ) {
    unbannedAtFilter = where.unbanned_at as Prisma.DateTimeNullableFilter;
  } else {
    unbannedAtFilter = undefined;
  }
  if (
    (body as any)?.unbanAtFrom !== undefined ||
    (body as any)?.unbanAtTo !== undefined
  ) {
    if (!unbannedAtFilter) {
      unbannedAtFilter = {};
    }
    if ((body as any)?.unbanAtFrom !== undefined) {
      unbannedAtFilter.gte = (body as any).unbanAtFrom;
    }
    if ((body as any)?.unbanAtTo !== undefined) {
      unbannedAtFilter.lte = (body as any).unbanAtTo;
    }
    where.unbanned_at = unbannedAtFilter;
  }
  // Pagination readonly, define defaults safely
  const page = (body as any)?.page ?? 1;
  const limit = (body as any)?.limit ?? 20;
  const sort = (body as any)?.sort ?? "ban_at_desc";
  const currentPage = page < 1 ? 1 : page;
  const perPage = limit < 1 ? 20 : limit;
  const skip = (currentPage - 1) * perPage;
  let orderBy: Prisma.community_platform_community_banned_usersOrderByWithRelationInput;
  switch (sort) {
    case "ban_at_asc":
      orderBy = { banned_at: "asc" };
      break;
    case "ban_at_desc":
      orderBy = { banned_at: "desc" };
      break;
    case "created_at_asc":
      orderBy = { created_at: "asc" };
      break;
    case "created_at_desc":
      orderBy = { created_at: "desc" };
      break;
    default:
      orderBy = { banned_at: "desc" };
      break;
  }
  const records =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where,
      skip,
      take: perPage,
      orderBy,
      select: {
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        community_id: true,
        user_id: true,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where,
    });
  // Map records, casting date fields to ISO string using toISOStringSafe for proper Format<'date-time'>
  const data = records.map((record) => ({
    banned_at: toISOStringSafe(record.banned_at) as string &
      tags.Format<"date-time">,
    unbanned_at:
      record.unbanned_at !== null && record.unbanned_at !== undefined
        ? toISOStringSafe(record.unbanned_at)
        : null,
    ban_reason: record.ban_reason,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    community_id: record.community_id,
    user_id: record.user_id,
  }));
  return {
    pagination: {
      current: currentPage,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data,
  };
}
