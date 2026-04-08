import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        comment_id: props.commentId,
        deleted_at: null,
      },
    });
  if (existingVote) {
    if (props.body.value === 0) {
      await MyGlobal.prisma.reddit_community_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else if (props.body.value !== undefined) {
      await MyGlobal.prisma.reddit_community_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          value: props.body.value,
          updated_at: new Date(),
        },
      });
    }
    const updated =
      await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCommunityCommentVoteTransformer.select(),
      });
    return await RedditCommunityCommentVoteTransformer.transform(updated);
  } else {
    if (props.body.value !== undefined && props.body.value !== 0) {
      const created =
        await MyGlobal.prisma.reddit_community_comment_votes.create({
          data: {
            id: v4(),
            member_id: props.member.id,
            comment_id: props.commentId,
            value: props.body.value,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          ...RedditCommunityCommentVoteTransformer.select(),
        });
      return await RedditCommunityCommentVoteTransformer.transform(created);
    }
    throw new HttpException("No existing vote to remove", 400);
  }
}
