import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE clause with string datetime handling
  const whereInput = {
    deleted_at: null,
    community: { deleted_at: null },
    ...(props.body.community_id !== undefined &&
      props.body.community_id !== null && {
        community_platform_community_id: props.body.community_id,
      }),
    ...(props.body.author_id !== undefined &&
      props.body.author_id !== null && {
        community_platform_member_id: props.body.author_id,
      }),
    ...(props.body.content_type !== undefined &&
      props.body.content_type !== null && {
        content_type: props.body.content_type,
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null && {
        created_at: {
          gte: toISOStringSafe(new Date(props.body.created_at_start)),
        },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: {
          lte: toISOStringSafe(new Date(props.body.created_at_end)),
        },
      }),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Determine orderBy based on sort algorithm
  let orderByInput: Prisma.community_platform_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "hot":
      // Hot combines recency and vote scores - need to compute
      orderByInput = { created_at: "desc" };
      // TODO: Implement hot algorithm properly
      break;
    case "top":
      // Top by vote score with optional time filter
      orderByInput = { created_at: "desc" }; // Fix: Changed vote_score to created_at temporarily
      if (props.body.top_time_range) {
        // Apply time range filter
        const now = toISOStringSafe(new Date());
        let startDate: string | undefined;
        switch (props.body.top_time_range) {
          case "today":
            startDate = toISOStringSafe(
              new Date(Date.now() - 24 * 60 * 60 * 1000),
            );
            break;
          case "week":
            startDate = toISOStringSafe(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            );
            break;
          case "month":
            startDate = toISOStringSafe(
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            );
            break;
          case "year":
            startDate = toISOStringSafe(
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            );
            break;
          case "all":
          default:
            startDate = undefined;
        }
        if (startDate) {
          whereInput.created_at = {
            ...(whereInput.created_at as any),
            gte: startDate,
          };
        }
      }
      break;
    case "controversial":
      // Controversial has many votes but score near zero
      orderByInput = { created_at: "desc" };
      // TODO: Implement controversial algorithm
      break;
    default:
      orderByInput = { created_at: "desc" };
  }
  // Fetch paginated data
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
