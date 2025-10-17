import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommentsCommentIdVotes(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote.ISummary> {
  const { commentId, body } = props;

  // Validate the comment exists and matches the given post
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      community_platform_post_id: body.postId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Pagination defaults (platform-wide patterns; update as per SDK if needed)
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const page = DEFAULT_PAGE;
  const limit = DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  // Query votes
  const [votes, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_votes.findMany({
      where: {
        community_platform_comment_id: commentId,
        vote_value: body.vote_value,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        community_platform_comment_id: commentId,
        vote_value: body.vote_value,
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map((vote) => ({
      id: vote.id,
      community_platform_comment_id: vote.community_platform_comment_id,
      community_platform_member_id: vote.community_platform_member_id,
      vote_value: vote.vote_value,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
    })),
  };
}
