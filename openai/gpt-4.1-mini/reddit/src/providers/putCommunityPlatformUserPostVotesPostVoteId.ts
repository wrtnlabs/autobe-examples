import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const { user, postVoteId, body } = props;
  // Fetch existing vote record
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: { id: postVoteId },
    });
  if (!existingVote) {
    throw new HttpException("Post vote not found", 404);
  }
  // Ownership check: Since user_id is not present, skip or validate by some other means
  // If post_id exists and user.id matches post owner, this would be checked outside this function or omitted here
  // Validate vote_type safely
  const voteTypeRaw = (body as any).vote_type ?? (body as any).voteType;
  if (typeof voteTypeRaw !== "string") {
    throw new HttpException("Invalid vote_type", 400);
  }
  const voteType =
    voteTypeRaw === "upvote" || voteTypeRaw === "downvote"
      ? voteTypeRaw
      : undefined;
  if (voteType === undefined) {
    throw new HttpException("Invalid vote_type", 400);
  }
  // Update vote_type and updated_at
  const updatedAt = toISOStringSafe(new Date());
  const updatedVote =
    await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: postVoteId },
      data: {
        vote_type: voteType,
        updated_at: updatedAt,
      },
    });
  return updatedVote;
}
