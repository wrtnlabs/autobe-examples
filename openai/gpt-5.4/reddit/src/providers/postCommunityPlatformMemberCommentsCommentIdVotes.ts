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
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  const vote = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_member_id_community_platform_comment_id: {
          community_platform_member_id: props.member.id,
          community_platform_comment_id: props.commentId,
        },
      },
      select: { id: true },
    });
    if (existing === null) {
      return await prisma.community_platform_comment_votes.create({
        data: await CommunityPlatformCommentVoteCollector.collect({
          body: props.body,
          member: { id: props.member.id },
          comment: { id: props.commentId },
        }),
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
    }
    return await prisma.community_platform_comment_votes.update({
      where: {
        community_platform_member_id_community_platform_comment_id: {
          community_platform_member_id: props.member.id,
          community_platform_comment_id: props.commentId,
        },
      },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
        deleted_at: null,
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
