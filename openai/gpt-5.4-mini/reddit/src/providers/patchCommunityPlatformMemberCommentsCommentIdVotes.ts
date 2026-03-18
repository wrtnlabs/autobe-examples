import { ICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteComment";
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

export async function patchCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVoteComment.IRequest;
}): Promise<IPageICommunityPlatformVoteComment> {
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_vote_comments.findFirst({
      where: {
        community_platform_comment_id: comment.id,
        vote: {
          community_platform_member_id: props.member.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        community_platform_vote_id: true,
        vote: {
          select: {
            id: true,
            direction: true,
          },
        },
      },
    });
    if (props.body.action === "remove") {
      if (existing !== null) {
        await prisma.community_platform_vote_comments.delete({
          where: { id: existing.id },
        });
        await prisma.community_platform_votes.delete({
          where: { id: existing.vote.id },
        });
      }
      return;
    }
    const nextDirection = props.body.action === "upvote" ? 1 : -1;
    if (existing === null) {
      const voteId = v4();
      await prisma.community_platform_votes.create({
        data: {
          id: voteId,
          community_platform_member_id: props.member.id,
          direction: nextDirection,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          commentTarget: {
            create: {
              id: v4(),
              community_platform_comment_id: props.commentId,
              created_at: now,
              updated_at: now,
              deleted_at: null,
            },
          },
        },
      });
      return;
    }
    if (existing.vote.direction !== nextDirection) {
      await prisma.community_platform_votes.update({
        where: { id: existing.vote.id },
        data: {
          direction: nextDirection,
          updated_at: now,
        },
      });
    }
  });
  const data = await MyGlobal.prisma.community_platform_vote_comments.findMany({
    where: { community_platform_comment_id: props.commentId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformVoteCommentTransformer.select(),
  });
  const records = await MyGlobal.prisma.community_platform_vote_comments.count({
    where: { community_platform_comment_id: props.commentId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformVoteCommentTransformer.transform,
    ),
  };
}
