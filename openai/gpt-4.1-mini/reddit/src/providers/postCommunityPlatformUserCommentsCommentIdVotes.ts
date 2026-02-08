import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteOfUsersCollector } from "../collectors/CommunityPlatformCommentVoteOfUsersCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommentsCommentIdVotes(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteOfUsers.ICreate;
}): Promise<ICommunityPlatformCommentVoteOfUsers> {
  const voteType = (
    props.body as {
      vote_type?: string;
    }
  ).vote_type;
  if (voteType !== "upvote" && voteType !== "downvote") {
    throw new HttpException(
      'Invalid vote_type, must be "upvote" or "downvote"',
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const comment = await tx.community_platform_comments.findUnique({
      where: { id: props.commentId },
      select: { id: true },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    const existingVote =
      await tx.community_platform_comment_vote_of_users.findUnique({
        where: {
          community_platform_comment_id_community_platform_user_id: {
            community_platform_comment_id: props.commentId,
            community_platform_user_id: props.user.id,
          },
        },
      });
    let voteRecord = existingVote;
    if (existingVote) {
      voteRecord = await tx.community_platform_comment_vote_of_users.update({
        where: { id: existingVote.id },
        data: {
          vote_type: voteType,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else {
      voteRecord = await tx.community_platform_comment_vote_of_users.create({
        data: await CommunityPlatformCommentVoteOfUsersCollector.collect({
          body: props.body,
          comment: { id: props.commentId },
          user: { id: props.user.id },
          vote_type: voteType,
        }),
      });
    }
    const voteCounts =
      await tx.community_platform_comment_vote_of_users.groupBy({
        by: ["community_platform_comment_id", "vote_type"],
        where: { community_platform_comment_id: props.commentId },
        _count: { _all: true },
      });
    let upvotes = 0;
    let downvotes = 0;
    for (const group of voteCounts) {
      if (group.vote_type === "upvote") upvotes = group._count._all;
      if (group.vote_type === "downvote") downvotes = group._count._all;
    }
    await tx.community_platform_comments.update({
      where: { id: props.commentId },
      data: {},
    });
    const userVoteCount =
      await tx.community_platform_comment_vote_of_users.count({
        where: {
          community_platform_user_id: props.user.id,
          vote_type: "upvote",
        },
      });
    await tx.community_platform_users.update({
      where: { id: props.user.id },
      data: { karma: userVoteCount },
    });
    return {
      id: voteRecord.id,
      community_platform_comment_id: voteRecord.community_platform_comment_id,
      community_platform_user_id: voteRecord.community_platform_user_id,
      vote_type: voteRecord.vote_type,
      created_at: toISOStringSafe(voteRecord.created_at),
      updated_at: toISOStringSafe(voteRecord.updated_at),
      deleted_at: voteRecord.deleted_at
        ? toISOStringSafe(voteRecord.deleted_at)
        : null,
    };
  });
}
