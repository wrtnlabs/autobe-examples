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
import { RedditCommentTransformer } from "../transformers/RedditCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditComment.IVote;
}): Promise<IRedditComment> {
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { post: { select: { reddit_members_id: true } } },
  });
  if (comment.post.reddit_members_id === props.member.id) {
    throw new HttpException("Votes on your own comments are not allowed", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_comment_votes.findUnique({
    where: {
      reddit_comment_id_reddit_member_id: {
        reddit_comment_id: props.commentId,
        reddit_member_id: props.member.id,
      },
    },
  });
  const voteDirection = props.body.vote;
  if (voteDirection === "remove") {
    if (existingVote) {
      await MyGlobal.prisma.reddit_comment_votes.delete({
        where: { id: existingVote.id },
      });
    } else {
      if (existingVote) {
        await MyGlobal.prisma.reddit_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_direction: voteDirection,
            updated_at: new Date(),
          },
        });
        {
          await MyGlobal.prisma.reddit_comment_votes.create({
            data: {
              id: v4(),
              reddit_comment_id: props.commentId,
              reddit_member_id: props.member.id,
              vote_direction: voteDirection,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          });
        }
      }
      const updatedComment =
        await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
          where: { id: props.commentId },
          ...RedditCommentTransformer.select(),
        });
      return await RedditCommentTransformer.transform(updatedComment);
    }
  }
}
