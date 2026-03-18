import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirstOrThrow({
      where: {
        id: props.voteId,
        comment_id: props.commentId,
        deleted_at: null,
        voter_id: props.member.id,
      },
      select: {
        id: true,
        comment_id: true,
        voter_id: true,
        voter: CommunityPlatformCommentVoteTransformer.select().select.voter,
        vote_direction: true,
        voted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
