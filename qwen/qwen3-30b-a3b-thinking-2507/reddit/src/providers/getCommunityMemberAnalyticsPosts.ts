import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberAnalyticsPosts(props: {
  member: MemberPayload;
}): Promise<ICommunityPostAnalytic> {
  const total = await MyGlobal.prisma.community_posts.count({
    where: { deleted_at: null },
  });
  const votes = await MyGlobal.prisma.community_votes.aggregate({
    _sum: {
      upvote: true,
      downvote: true,
    },
  });
  const totalUpvotes = votes._sum.upvote ?? 0;
  const totalDownvotes = votes._sum.downvote ?? 0;
  const averageKarma = total > 0 ? (totalUpvotes - totalDownvotes) / total : 0;
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: { deleted_at: null },
    take: 5,
    select: {
      id: true,
      title: true,
      type: true,
      created_at: true,
      author: {
        select: {
          id: true,
          display_name: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
  });
  const transformedPosts = await ArrayUtil.asyncMap(posts, async (post) =>
    CommunityPostTransformer.transform(post),
  );
  return {
    totalPosts: total,
    averageKarma,
    topPosts: transformedPosts,
  };
}
