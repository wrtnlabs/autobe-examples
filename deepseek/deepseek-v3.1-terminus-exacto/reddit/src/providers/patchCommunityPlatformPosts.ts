import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.post_type && { post_type: props.body.post_type }),
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
      ],
    }),
  };
  // If limit is 0, return empty results immediately
  if (limit === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: 0,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  try {
    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      MyGlobal.prisma.community_platform_posts.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...CommunityPlatformPostAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_posts.count({
        where: whereInput,
      }),
    ]);
    // Transform data
    const transformedData = await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostAtSummaryTransformer.transform,
    );
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } catch (error) {
    // Log error for monitoring
    console.error("Error searching posts:", error);
    // Return empty results on error
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
}
