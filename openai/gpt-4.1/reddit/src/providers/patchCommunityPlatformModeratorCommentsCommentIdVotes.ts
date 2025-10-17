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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommentsCommentIdVotes(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote.ISummary> {
  const { moderator, commentId, body } = props;

  // 1. Fetch the comment and its post/community
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      community_platform_post_id: true,
      deleted_at: true,
    },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or deleted", 404);
  }

  // 2. Fetch post (to get community_id)
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.community_platform_post_id },
    select: {
      id: true,
      community_platform_community_id: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or deleted", 404);
  }
  const communityId = post.community_platform_community_id;

  // 3. Authorization: is this moderator assigned to the community?
  const modAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id,
        community_id: communityId,
        deleted_at: null,
        status: "active",
      },
    });
  if (!modAssignment) {
    throw new HttpException(
      "You are not authorized to moderate this community",
      403,
    );
  }

  // 4. Query votes for this commentId, filtered by optional body.vote_value
  const votes = await MyGlobal.prisma.community_platform_comment_votes.findMany(
    {
      where: {
        community_platform_comment_id: commentId,
        ...(body.vote_value !== undefined
          ? { vote_value: body.vote_value }
          : {}),
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    },
  );

  // 5. Build ISummary[]
  const data = votes.map((vote) => ({
    id: vote.id,
    community_platform_comment_id: vote.community_platform_comment_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  }));

  // 6. Pagination: platform requires current, limit, records, pages
  const totalRecords = data.length;
  return {
    pagination: {
      current: 1,
      limit: totalRecords,
      records: totalRecords,
      pages: 1,
    },
    data,
  };
}
