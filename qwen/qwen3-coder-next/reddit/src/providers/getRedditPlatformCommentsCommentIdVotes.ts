import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentVote";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommentsCommentIdVotes(props: {
  commentId: string;
}): Promise<IPageIRedditPlatformCommentVote.ISummary> {
  const { commentId } = props;
  // Count total votes for this comment
  const total = await MyGlobal.prisma.reddit_platform_comment_votes.count({
    where: {
      comment_id: commentId,
    },
  });
  // Get paginated votes with user information
  const data = await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
    where: {
      comment_id: commentId,
    },
    select: {
      id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      user_id: true,
      comment_id: true,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 100, // Default limit
    skip: 0, // Default offset
  });
  // Transform data to response format
  const transformedData: IRedditPlatformCommentVote.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      vote_type: record.vote_type,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      user: {
        id: record.user_id,
        username: "", // This would need to be fetched separately
        profile: {
          display_name: null,
          avatar_url: null,
        },
      },
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
  };
}
