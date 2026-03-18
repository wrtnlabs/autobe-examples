import { ICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteCommentTransformer } from "../transformers/CommunityPlatformVoteCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteComment> {
  const record =
    await MyGlobal.prisma.community_platform_vote_comments.findFirstOrThrow({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
      },
      ...CommunityPlatformVoteCommentTransformer.select(),
    });
  return await CommunityPlatformVoteCommentTransformer.transform(record);
}
