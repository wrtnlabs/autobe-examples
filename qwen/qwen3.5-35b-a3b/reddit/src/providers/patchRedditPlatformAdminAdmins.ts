import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdmin";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformAdminAtSummaryTransformer } from "../transformers/RedditPlatformAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditPlatformAdmin.IRequest;
}): Promise<IPageIRedditPlatformAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const whereInput: Prisma.reddit_platform_adminsWhereInput = {
    ...(props.body.isActive !== undefined
      ? { is_active: props.body.isActive }
      : undefined),
    ...(props.body.usernameSearch !== undefined
      ? {
          username: {
            contains: props.body.usernameSearch,
            mode: "insensitive" as const,
          },
        }
      : undefined),
    ...(props.body.emailSearch !== undefined
      ? {
          email: {
            contains: props.body.emailSearch,
            mode: "insensitive" as const,
          },
        }
      : undefined),
    ...(props.body.createdAfter !== undefined
      ? { created_at: { gt: new Date(props.body.createdAfter) } }
      : undefined),
    ...(props.body.createdBefore !== undefined
      ? { created_at: { lt: new Date(props.body.createdBefore) } }
      : undefined),
  } satisfies Prisma.reddit_platform_adminsWhereInput;
  const orderByInput = (() => {
    const sortField = props.body.sortBy ?? "createdAt";
    const sortDirection = props.body.sortOrder ?? "desc";
    const fieldMap = {
      createdAt: "created_at",
      username: "username",
      isActive: "is_active",
    } as const;
    return {
      [fieldMap[sortField]]: sortDirection,
    } as const;
  })() satisfies Prisma.reddit_platform_adminsOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_admins.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_admins.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformAdminAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformAdmin.ISummary;
}
