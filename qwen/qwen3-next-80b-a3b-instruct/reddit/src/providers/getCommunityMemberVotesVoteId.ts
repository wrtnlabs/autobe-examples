import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
import { CommunityPostVoteTransformer } from "../transformers/CommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPostVote> {
  const vote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: { id: props.voteId, deleted_at: null },
    ...CommunityPostVoteTransformer.select(),
  });
  if (!vote) throw new HttpException("Vote not found", 404);
  // Authorization check: voter must be requester, OR post author, OR mod/admin of community
  const isVoter = vote.member?.id === props.member.id;
  if (!isVoter) {
    // Fetch post to check if requester is author or mod/admin of the community
    const post = await MyGlobal.prisma.community_posts.findUnique({
      where: { id: vote.post?.id },
      select: { author: true, community: true },
    });
    if (!post) throw new HttpException("Vote not found", 404);
    const isAuthor = post.author?.id === props.member.id;
    if (!isAuthor) {
      // Check if member is any type of actor (member, moderator, or admin) of the community
      // Correct path: use community_subscriptions to find if member is subscribed to this community
      const isCommunityActor =
        await MyGlobal.prisma.community_subscriptions.findFirst({
          where: {
            community_member_id: props.member.id,
            community_community_id: post.community?.id,
          },
        });
      if (!isCommunityActor) throw new HttpException("Unauthorized", 403);
    }
  }
  return CommunityPostVoteTransformer.transform(vote);
}
