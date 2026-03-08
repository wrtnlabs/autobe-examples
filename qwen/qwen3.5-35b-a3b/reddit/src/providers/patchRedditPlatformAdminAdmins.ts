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
import { RedditPlatformAdminTransformer } from "../transformers/RedditPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditPlatformAdmin.IRequest;
}): Promise<IPageIRedditPlatformAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_adminsWhereInput = {
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.username !== undefined && {
      username: { contains: props.body.username, mode: "insensitive" },
    }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.createdAfter !== undefined && {
      created_at: { gte: props.body.createdAfter },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lt: props.body.createdBefore },
    }),
  } satisfies Prisma.reddit_platform_adminsWhereInput;
  const orderByInput: Prisma.reddit_platform_adminsOrderByWithRelationInput[] =
    props.body.sortBy === "karmaScore"
      ? [{ created_at: "desc" }]
      : props.body.sortOrder === "asc"
        ? [{ created_at: "asc" }]
        : [{ created_at: "desc" }];
  const data = await MyGlobal.prisma.reddit_platform_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformAdminTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformAdminTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformAdmin.ISummary;
}
