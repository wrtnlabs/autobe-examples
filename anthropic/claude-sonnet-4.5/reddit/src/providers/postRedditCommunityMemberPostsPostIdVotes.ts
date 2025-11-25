import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  const now = new Date();
  const voteId = v4();

  const vote = await MyGlobal.prisma.reddit_community_post_votes.upsert({
    where: {
      reddit_community_member_id_reddit_community_post_id: {
        reddit_community_member_id: props.member.id,
        reddit_community_post_id: props.postId,
      },
    },
    create: {
      id: voteId,
      reddit_community_post_id: props.postId,
      reddit_community_member_id: props.member.id,
      vote_type: props.body.vote_type,
      created_at: now,
      updated_at: now,
    },
    update: {
      vote_type: props.body.vote_type,
      updated_at: now,
    },
  });

  return {
    id: vote.id,
    post_id: vote.reddit_community_post_id,
    member_id: vote.reddit_community_member_id,
    vote_type: vote.vote_type as 1 | -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
