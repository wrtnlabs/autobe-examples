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

export async function putRedditCloneMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneVote.IUpdate;
}): Promise<IRedditCloneVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      member_id: true,
    } satisfies Prisma.reddit_clone_postsSelect,
  });
  if (post.member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
  });
  if (props.body.vote_type === null) {
    if (existingVote) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
        },
      });
      const vote = await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCloneVoteTransformer.select(),
      });
      return await RedditCloneVoteTransformer.transform(vote);
    }
    throw new HttpException("No existing vote to remove", 400);
  } else {
    let vote: Awaited<ReturnType<typeof RedditCloneVoteTransformer.transform>>;
    if (existingVote) {
      const updated = await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
        ...RedditCloneVoteTransformer.select(),
      });
      vote = await RedditCloneVoteTransformer.transform(updated);
    } else {
      const created = await MyGlobal.prisma.reddit_clone_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          target_type: "POST",
          target_id: props.postId,
          vote_type: props.body.vote_type,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...RedditCloneVoteTransformer.select(),
      });
      vote = await RedditCloneVoteTransformer.transform(created);
    }
    return vote;
  }
}
