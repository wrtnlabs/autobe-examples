import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // First check if the comment exists
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Verify the vote exists and belongs to the user
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: props.voteId,
        comment_id: props.commentId,
      },
    });
  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }
  if (existingVote.user_id !== props.user.id) {
    throw new HttpException("You can only update your own votes", 403);
  }
  // Update the vote with new vote_type
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: props.voteId },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    },
  );
  return await CommunityPlatformCommentVoteTransformer.transform(updated);
}
