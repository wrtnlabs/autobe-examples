import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string;
}): Promise<ICommunityPostVote.IState> {
  // Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, is_deleted: true },
  });
  if (post === null || post.is_deleted) {
    throw new HttpException("Post not found", 404);
  }
  // Query for the member's vote on this post
  const vote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: {
      community_member_id_community_post_id: {
        community_member_id: props.member.id,
        community_post_id: props.postId,
      },
    },
    select: {
      is_upvote: true,
    },
  });
  // If no vote record exists, return null vote type
  if (vote === null) {
    return {
      voteType: null,
    } satisfies ICommunityPostVote.IState;
  }
  // Return the vote type based on is_upvote field
  return {
    voteType: vote.is_upvote ? "UPVOTE" : "DOWNVOTE",
  } satisfies ICommunityPostVote.IState;
}
