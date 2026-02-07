import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.IUpdate;
}): Promise<ICommunityPlatformVote> {
  const { member, voteId, body } = props;
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.user_id !== member.id) {
    throw new HttpException("Unauthorized", 403);
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  const vote_type = body.vote_type;
  if (vote_type === undefined || !["up", "down"].includes(vote_type)) {
    throw new HttpException('Invalid vote_type. Must be "up" or "down".', 400);
  }
  const updated = await MyGlobal.prisma.community_platform_votes.update({
    where: { id: voteId },
    include: { user: true },
    data: {
      vote_type,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await CommunityPlatformVoteTransformer.transform(updated);
}
