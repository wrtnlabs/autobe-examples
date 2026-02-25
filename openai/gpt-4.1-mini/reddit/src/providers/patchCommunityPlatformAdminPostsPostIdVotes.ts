import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  if (
    props.body.voteType !== "upvote" &&
    props.body.voteType !== "downvote" &&
    props.body.voteType !== null
  ) {
    throw new HttpException("Invalid voteType", 400);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const voteId = v4() as string & tags.Format<"uuid">;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { id: true },
    });
    let existingVote;
    if (props.body.voteType === null) {
      existingVote = await tx.community_platform_post_votes.findFirst({
        where: {
          post_id: props.postId,
          vote_type: undefined,
          deleted_at: null,
        },
      });
    } else {
      existingVote = await tx.community_platform_post_votes.findFirst({
        where: {
          post_id: props.postId,
          vote_type: props.body.voteType,
          deleted_at: null,
        },
      });
    }
    if (props.body.voteType === null) {
      if (existingVote) {
        await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: { deleted_at: now, updated_at: now },
        });
      }
    } else {
      if (existingVote) {
        if (existingVote.vote_type !== props.body.voteType) {
          await tx.community_platform_post_votes.update({
            where: { id: existingVote.id },
            data: {
              vote_type: props.body.voteType,
              updated_at: now,
              deleted_at: null,
            },
          });
        }
      } else {
        await tx.community_platform_post_votes.create({
          data: {
            id: voteId,
            post_id: props.postId,
            vote_type: props.body.voteType,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
    }
    const upvotesCount = await tx.community_platform_post_votes.count({
      where: {
        post_id: props.postId,
        vote_type: "upvote",
        deleted_at: null,
      },
    });
    const downvotesCount = await tx.community_platform_post_votes.count({
      where: {
        post_id: props.postId,
        vote_type: "downvote",
        deleted_at: null,
      },
    });
    return {
      upvotes: upvotesCount,
      downvotes: downvotesCount,
    };
  });
}
