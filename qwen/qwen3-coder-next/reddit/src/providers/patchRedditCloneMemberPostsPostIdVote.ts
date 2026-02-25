import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditCloneContentPostVote.ICreate;
}): Promise<IRedditCloneContentPostVote.ISummary> {
  const { member, postId, body } = props;
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: postId },
      select: { id: true, author_id: true },
    });
  if (post.author_id === member.id) {
    throw new HttpException("Self-voting is prohibited", 403);
  }
  const voteValue =
    body.voteType === "upvote" ? 1 : body.voteType === "downvote" ? -1 : 0;
  let vote = await MyGlobal.prisma.reddit_clone_content_post_votes.upsert({
    where: {
      member_id_post_id: {
        member_id: member.id,
        post_id: postId,
      },
    },
    create: {
      id: v4(),
      member_id: member.id,
      post_id: postId,
      vote_value: voteValue,
      created_at: new Date(),
      updated_at: new Date(),
    },
    update: {
      vote_value: voteValue,
      updated_at: new Date(),
    },
    select: {
      id: true,
      vote_value: true,
      created_at: true,
      updated_at: true,
    },
  });
  const voteScore: number & tags.Type<"int32"> = vote.vote_value as number &
    tags.Type<"int32">;
  const userVote: "upvote" | "downvote" | "none" =
    vote.vote_value === 1
      ? "upvote"
      : vote.vote_value === -1
        ? "downvote"
        : "none";
  return {
    voteType: userVote,
    voteScore: voteScore,
    userVote: userVote,
  };
}
