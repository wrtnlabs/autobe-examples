import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneVoteTransformer } from "../transformers/RedditCloneVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneVote.IVote;
}): Promise<IRedditCloneVote> {
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: { id: true, reddit_clone_member_id: true },
    },
  );
  if (comment.reddit_clone_member_id === props.member.id) {
    throw new HttpException("Cannot vote on own comment", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "COMMENT",
      target_id: props.commentId,
      deleted_at: null,
    },
  });
  if (existingVote) {
    if (props.body.vote_type === null) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
        },
      });
      const deleted =
        await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...RedditCloneVoteTransformer.select(),
        });
      return await RedditCloneVoteTransformer.transform(deleted);
    } else {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
      });
      const updated =
        await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...RedditCloneVoteTransformer.select(),
        });
      return await RedditCloneVoteTransformer.transform(updated);
    }
  } else {
    if (props.body.vote_type === null) {
      throw new HttpException("No vote exists to remove", 400);
    }
    const created = await MyGlobal.prisma.reddit_clone_votes.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        target_type: "COMMENT",
        target_id: props.commentId,
        vote_type: props.body.vote_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...RedditCloneVoteTransformer.select(),
    });
    return await RedditCloneVoteTransformer.transform(created);
  }
}
