import { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityCommentVoteSummaryTransformer } from "../transformers/CommunityCommentVoteSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminCommentsCommentIdVoteSummary(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityCommentVoteSummary> {
  const summary =
    await MyGlobal.prisma.community_comment_vote_summaries.findUnique({
      where: {
        community_comment_id: props.commentId,
      },
      ...CommunityCommentVoteSummaryTransformer.select(),
    });
  if (!summary) {
    throw new HttpException("Comment vote summary not found", 404);
  }
  return await CommunityCommentVoteSummaryTransformer.transform(summary);
}
