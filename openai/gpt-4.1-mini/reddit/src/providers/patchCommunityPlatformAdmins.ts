import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdmins(props: {
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  const body = props.body;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;
  const where: {
    email?: {
      contains: string;
      mode: "insensitive";
    };
    display_name?: {
      contains: string;
      mode: "insensitive";
    };
    deleted_at?: null | {
      not: null;
    };
  } = {};
  if (typeof body.email === "string" && body.email.length > 0) {
    where.email = { contains: body.email, mode: "insensitive" };
  }
  if (typeof body.displayName === "string" && body.displayName.length > 0) {
    where.display_name = { contains: body.displayName, mode: "insensitive" };
  }
  if (body.deleted === true) {
    where.deleted_at = { not: null };
  } else if (body.deleted === false) {
    where.deleted_at = null;
  }
  const records = await MyGlobal.prisma.community_platform_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const totalCount = await MyGlobal.prisma.community_platform_admins.count({
    where,
  });
  const data = records.map((record) => {
    return {
      id: record.id,
      email: record.email,
      displayName: record.display_name,
      bio: record.bio === null ? undefined : record.bio,
      avatarUrl: record.avatar_url === null ? undefined : record.avatar_url,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null
          ? undefined
          : toISOStringSafe(record.deleted_at),
    };
  });
  const pagination = {
    current: page,
    limit: limit,
    records: totalCount,
    pages: Math.ceil(totalCount / limit),
  };
  return { data, pagination };
}
