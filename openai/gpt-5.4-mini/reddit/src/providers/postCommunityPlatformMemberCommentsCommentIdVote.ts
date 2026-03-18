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
import { CommunityPlatformVoteCollector } from "../collectors/CommunityPlatformVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  if (props.body.direction !== 1 && props.body.direction !== -1) {
    throw new HttpException("Invalid vote direction", 400);
  }
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  const vote = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      ...CommunityPlatformVoteTransformer.select(),
    });
    if (existing === null) {
      return prisma.community_platform_votes.create({
        data: await CommunityPlatformVoteCollector.collect({
          body: props.body,
          member: props.member,
        }),
        ...CommunityPlatformVoteTransformer.select(),
      });
    }
    if (existing.direction === props.body.direction) {
      return existing;
    }
    const updated = await prisma.community_platform_votes.update({
      where: { id: existing.id },
      data: {
        direction: props.body.direction,
        updated_at: toISOStringSafe(new Date()) as unknown as never,
      },
      ...CommunityPlatformVoteTransformer.select(),
    });
    return updated;
  });
  return CommunityPlatformVoteTransformer.transform(vote);
}
