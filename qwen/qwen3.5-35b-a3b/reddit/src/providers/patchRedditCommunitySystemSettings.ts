import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemSettingAtSummaryTransformer } from "../transformers/RedditCommunitySystemSettingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunitySystemSettings(props: {
  body: IRedditCommunitySystemSetting.IRequest;
}): Promise<IPageIRedditCommunitySystemSetting.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.reddit_community_system_settingsWhereInput = {
    // Default: exclude soft-deleted records unless explicitly requested
    ...(props.body.deletedAt !== undefined
      ? props.body.deletedAt === null
        ? { deleted_at: null }
        : { deleted_at: { not: null } }
      : { deleted_at: null }),
    // Key search (partial case-insensitive match)
    ...(props.body.key !== undefined
      ? {
          key: {
            contains: props.body.key,
            mode: "insensitive",
          },
        }
      : {}),
    // Description search (partial case-insensitive match)
    ...(props.body.description !== undefined && props.body.description !== null
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive",
          },
        }
      : {}),
    // Date range filters
    ...(props.body.createdAfter !== undefined
      ? { created_at: { gte: new Date(props.body.createdAfter) } }
      : {}),
    ...(props.body.createdBefore !== undefined
      ? { created_at: { lte: new Date(props.body.createdBefore) } }
      : {}),
    ...(props.body.updatedAfter !== undefined
      ? { updated_at: { gte: new Date(props.body.updatedAfter) } }
      : {}),
    ...(props.body.updatedBefore !== undefined
      ? { updated_at: { lte: new Date(props.body.updatedBefore) } }
      : {}),
  } satisfies Prisma.reddit_community_system_settingsWhereInput;
  // Build orderBy clause
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "asc";
  const orderByInput:
    | Prisma.reddit_community_system_settingsOrderByWithRelationInput
    | Prisma.reddit_community_system_settingsOrderByWithRelationInput[] =
    props.body.sort === "key"
      ? { key: sortOrder }
      : props.body.sort === "created_at"
        ? { created_at: sortOrder }
        : props.body.sort === "updated_at"
          ? { updated_at: sortOrder }
          : { created_at: "desc" };
  // Execute findMany with transformer select
  const data = await MyGlobal.prisma.reddit_community_system_settings.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunitySystemSettingAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_community_system_settings.count({
    where: whereInput,
  });
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  // Transform and return response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySystemSettingAtSummaryTransformer.transform,
    ),
    pagination,
  } satisfies IPageIRedditCommunitySystemSetting.ISummary;
}
