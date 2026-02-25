import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommentAtSummaryTransformer } from "../transformers/RedditCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditComment.IVote;
}): Promise<IRedditComment.ISummary> {
  const existingVote = await MyGlobal.prisma.reddit_comment_votes.findFirst({
    where: {
      comment: { id: props.commentId },
      member: { id: props.member.id },
      deleted_at: null,
    },
  });
  switch (props.body.vote) {
    case "up":
    case "down":
      if (existingVote) {
        await MyGlobal.prisma.reddit_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote: props.body.vote,
            updated_at: toISOStringSafe(new Date()),
          },
        });
        await MyGlobal.prisma.reddit_comment_votes.create({
          data: {
            id: v4(),
            vote: props.body.vote,
            member: { connect: { id: props.member.id } },
            comment: { connect: { id: props.commentId } },
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
        break;
      }
    case "remove":
      if (existingVote) {
        await MyGlobal.prisma.reddit_comment_votes.update({
          where: { id: existingVote.id },
          data: { deleted_at: toISOStringSafe(new Date()) },
        });
      }
      break;
  }
  const updatedComment =
    await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: RedditCommentAtSummaryTransformer.select(),
    });
  return RedditCommentAtSummaryTransformer.transform(updatedComment);
}
