import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostsPostIdVotesVoteId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Verify vote exists and belongs to the authenticated user
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: { id: true, user_id: true, post_id: true },
    });
  // Validate ownership
  if (existingVote.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate post reference
  if (existingVote.post_id !== props.postId) {
    throw new HttpException("Vote does not belong to the specified post", 400);
  }
  // Update the vote record
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.voteId },
    data: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
  });
  // Retrieve the updated vote with complete relationships
  const updatedVote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  return await CommunityPlatformPostVoteTransformer.transform(updatedVote);
}
