import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentVoteTransformer } from "../transformers/CommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdCommentsCommentIdVotesVoteId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityCommentVote> {
  // Step 1: Validate post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate comment exists, belongs to this post, and is not deleted
  await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 3: Query the vote scoped to commentId, must be active (not retracted)
  const vote = await MyGlobal.prisma.community_comment_votes.findFirstOrThrow({
    where: {
      id: props.voteId,
      community_comment_id: props.commentId,
      deleted_at: null,
    },
    ...CommunityCommentVoteTransformer.select(),
  });
  // Step 4: Transform and return
  return CommunityCommentVoteTransformer.transform(vote);
}
