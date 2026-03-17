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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause from filter parameters
  const whereInput: Prisma.reddit_community_system_settingsWhereInput = {
    // Handle deleted_at filter: null = show active, non-null = show deleted, undefined = show active (default)
    deleted_at:
      props.body.deletedAt !== undefined
        ? props.body.deletedAt === null
          ? null // Show active records
          : {
              not: null, // Show deleted records
            }
        : null, // Default to active records
    ...(props.body.key !== undefined
      ? {
          key: {
            contains: props.body.key,
            mode: "insensitive" as const,
          },
        }
      : undefined),
    ...(props.body.description !== undefined && props.body.description !== null
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive" as const,
          },
        }
      : undefined),
    ...(props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
      ? {
          created_at: {
            ...(props.body.createdAfter !== undefined
              ? { gte: props.body.createdAfter }
              : undefined),
            ...(props.body.createdBefore !== undefined
              ? { lte: props.body.createdBefore }
              : undefined),
          },
        }
      : undefined),
    ...(props.body.updatedAfter !== undefined ||
    props.body.updatedBefore !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedAfter !== undefined
              ? { gte: props.body.updatedAfter }
              : undefined),
            ...(props.body.updatedBefore !== undefined
              ? { lte: props.body.updatedBefore }
              : undefined),
          },
        }
      : undefined),
  } satisfies Prisma.reddit_community_system_settingsWhereInput;
  // Determine sort field with validation
  const validSortFields = ["key", "created_at", "updated_at"] as const;
  const sortField = validSortFields.includes(props.body.sort ?? "created_at")
    ? (props.body.sort ?? "created_at")
    : "created_at";
  // Determine sort order with validation
  const sortOrder = ["asc", "desc"].includes(props.body.sortOrder ?? "desc")
    ? (props.body.sortOrder ?? "desc")
    : "desc";
  const orderByInput: Prisma.reddit_community_system_settingsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    } satisfies Prisma.reddit_community_system_settingsOrderByWithRelationInput;
  // Query records
  const data = await MyGlobal.prisma.reddit_community_system_settings.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunitySystemSettingAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.reddit_community_system_settings.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySystemSettingAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
