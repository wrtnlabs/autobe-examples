import { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityCommentVoteSummaryTransformer } from "../transformers/CommunityCommentVoteSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorCommentsCommentIdVoteSummary(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityCommentVoteSummary> {
  const voteSummary =
    await MyGlobal.prisma.community_comment_vote_summaries.findUnique({
      where: { community_comment_id: props.commentId },
      select: {
        id: true,
        total_upvotes: true,
        total_downvotes: true,
        net_score: true,
        comment: {
          select: {
            id: true,
            community_member_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            status: true,
            content: true,
            community_post_id: true,
            parent_id: true,
          },
        },
      },
    });
  if (!voteSummary) {
    throw new HttpException("Comment vote summary not found", 404);
  }
  return await CommunityCommentVoteSummaryTransformer.transform(voteSummary);
}
