import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityVoteTransformer } from "../transformers/RedditCommunityVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityVote.IUpdate;
}): Promise<IRedditCommunityVote> {
  const now = new Date();
  // Step 1: Query vote by ID - select FK for ownership check + transformer for nested relations
  const vote = await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      member_id: true,
      ...RedditCommunityVoteTransformer.select().select,
    },
  });
  // Step 2: Verify ownership - authenticated member must own the vote
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Determine vote state transition
  const newVoteType: "upvote" | "downvote" | null =
    props.body.vote_type ?? null;
  const existingVoteType = vote.vote_type as "upvote" | "downvote";
  // Step 4: Prepare update data
  let updateData: Prisma.reddit_community_votesUpdateInput = {
    updated_at: now,
  };
  if (newVoteType === null) {
    // Soft delete (remove vote)
    updateData = {
      ...updateData,
      deleted_at: now,
    };
  } else if (newVoteType !== existingVoteType) {
    // Change vote direction (upvote ↔ downvote)
    updateData = {
      ...updateData,
      vote_type: newVoteType,
    };
  }
  // Step 5: Update vote record and re-query with full relations
  const updatedVote = await MyGlobal.prisma.reddit_community_votes.update({
    where: { id: props.voteId },
    data: updateData,
    ...RedditCommunityVoteTransformer.select(),
  });
  // Step 6: Transform and return updated vote
  return await RedditCommunityVoteTransformer.transform(updatedVote);
}
