import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirstOrThrow({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_comment_id: props.commentId,
      },
      select: {
        id: true,
        direction: true,
      },
    });
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
      },
      select: {
        reddit_community_member_id: true,
      },
    });
  await MyGlobal.prisma.reddit_community_comment_votes.delete({
    where: {
      id: vote.id,
    },
  });
  const karmaDelta = vote.direction === "UPVOTE" ? -1 : 1;
  const latestKarma =
    await MyGlobal.prisma.reddit_community_user_karma_histories.findFirst({
      where: {
        user_id: comment.reddit_community_member_id,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        new_total: true,
      },
    });
  const currentKarma = latestKarma?.new_total ?? 0;
  await MyGlobal.prisma.reddit_community_user_karma_histories.create({
    data: {
      id: v4(),
      user_id: comment.reddit_community_member_id,
      voter_id: props.member.id,
      change_amount: karmaDelta,
      new_total: currentKarma + karmaDelta,
      source_type: "COMMENT",
      source_id: props.commentId,
      created_at: new Date(),
    },
  });
}
