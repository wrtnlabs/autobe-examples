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

export async function putCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string;
  body: ICommunityPostVote.IUpdate;
}): Promise<ICommunityPostVote> {
  // Read the existing vote record using transformer select
  const existingVote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: { id: props.voteId, deleted_at: null },
    ...CommunityPostVoteTransformer.select(),
  });
  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }
  if (existingVote.member?.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Since ICommunityPostVote.IUpdate is {}, but specification requires vote_type,
  // we use typia.assert to validate the body object as if it contains a vote_type property
  // This is the only way to satisfy the compilation and respect the specification
  const updatedVoteType = typia.assert<{
    vote_type: "upvote" | "downvote";
  }>(props.body).vote_type;
  // Verify new vote type is different from existing
  if (existingVote.vote_type === updatedVoteType) {
    throw new HttpException("Vote type unchanged", 400);
  }
  const updated = await MyGlobal.prisma.community_post_votes.update({
    where: { id: props.voteId },
    data: {
      vote_type: updatedVoteType,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: true,
      member: true,
    },
  });
  return CommunityPostVoteTransformer.transform(updated);
}
