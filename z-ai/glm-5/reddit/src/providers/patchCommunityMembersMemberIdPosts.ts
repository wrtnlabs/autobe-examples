import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMembersMemberIdPosts(props: {
  memberId: string;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // Verify member exists
  await MyGlobal.prisma.community_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 25, 10), 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.community_postsWhereInput = {
    author_id: props.memberId,
    is_deleted: false,
  };
  // Search filter
  if (props.body.search) {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { text_content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Community filter
  if (props.body.communityId) {
    whereInput.community_id = props.body.communityId;
  }
  // Post type filter
  if (props.body.postType) {
    whereInput.post_type = props.body.postType;
  }
  // Time filter for 'top' sort
  if (
    props.body.sort === "top" &&
    props.body.time &&
    props.body.time !== "all"
  ) {
    const now = new Date();
    let timeThreshold: Date;
    switch (props.body.time) {
      case "today":
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeThreshold = new Date(0);
    }
    whereInput.created_at = { gte: timeThreshold };
  }
  // Build orderBy
  const orderByInput = (
    props.body.sort === "hot"
      ? { hot_score: "desc" as const }
      : props.body.sort === "top"
        ? { vote_score: "desc" as const }
        : props.body.sort === "controversial"
          ? { controversy_score: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.community_postsOrderByWithRelationInput;
  // Sequential await for findMany + count
  const data = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
