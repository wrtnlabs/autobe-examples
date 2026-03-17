import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date().toISOString());
  const vote = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      await prisma.community_platform_post_votes.update({
        where: { id: existing.id },
        data: {
          direction: props.body.direction,
          deleted_at: null,
          updated_at: now,
        },
      });
    } else {
      await prisma.community_platform_post_votes.create({
        data: {
          id: v4(),
          direction: props.body.direction,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          member: {
            connect: {
              id: props.member.id,
            },
          },
          post: {
            connect: {
              id: props.postId,
            },
          },
        },
      });
    }
    const persisted =
      await prisma.community_platform_post_votes.findFirstOrThrow({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
          deleted_at: null,
        },
        ...CommunityPlatformPostVoteTransformer.select(),
      });
    return persisted;
  });
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
