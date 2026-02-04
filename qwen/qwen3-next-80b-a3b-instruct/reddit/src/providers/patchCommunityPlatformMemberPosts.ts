import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

export async function patchCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const timeRange = props.body.timeRange;
  const isTopSort = props.body.sort === "top";
  // Get community IDs the member subscribes to
  const subscribedCommunityIds = (
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: {
        community_platform_member_id: props.member.id,
      },
      select: {
        community_platform_community_id: true,
      },
    })
  ).map((sub) => sub.community_platform_community_id);
  // Construct whereInput with all properties from start
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    community: {
      id: {
        in: subscribedCommunityIds,
      },
    },
  };
  // Apply timeRange filter only for 'top' sort
  if (isTopSort && timeRange) {
    const now = new Date();
    let startDate: Date | undefined;
    switch (timeRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "this week":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case "this month":
        startDate = new Date(now.setDate(1));
        break;
      case "this year":
        startDate = new Date(now.setMonth(0, 1));
        break;
      case "all time":
        startDate = undefined;
        break;
    }
    if (startDate) {
      whereInput.created_at = {
        gte: toISOStringSafe(startDate),
      };
    }
  }
  const orderByInput = (
    props.body.sort === "hot"
      ? {
          vote_score: "desc" as const,
        }
      : props.body.sort === "new"
        ? {
            created_at: "desc" as const,
          }
        : props.body.sort === "top"
          ? {
              vote_score: "desc" as const,
            }
          : props.body.sort === "controversial"
            ? {
                vote_score: "desc" as const,
              }
            : {
                created_at: "desc" as const,
              }
  ) satisfies Prisma.community_platform_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
