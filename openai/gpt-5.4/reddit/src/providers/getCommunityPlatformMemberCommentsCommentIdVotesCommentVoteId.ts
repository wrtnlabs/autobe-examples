import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function getCommunityPlatformMemberCommentsCommentIdVotesCommentVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirstOrThrow({
      where: {
        id: props.commentVoteId,
        community_platform_comment_id: props.commentId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
