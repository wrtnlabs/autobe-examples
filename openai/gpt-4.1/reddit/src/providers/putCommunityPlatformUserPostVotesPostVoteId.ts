import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // 1. Retrieve the vote record, ensure not soft-deleted
  const found = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
  });

  if (!found || found.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }

  // 2. Authorization check: only the voter can update/remove the vote
  if (found.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: Only the voter can edit or remove this vote",
      403,
    );
  }

  // 3. Update data logic
  let updated;
  if (typeof props.body.vote_type === "string") {
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.postVoteId },
      data: {
        vote_type: props.body.vote_type,
        deleted_at: null,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    // Vote removal (soft delete)
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.postVoteId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // 4. Fetch minimal summary references for user and post
  const postSummary = updated.community_platform_post_id
    ? await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: updated.community_platform_post_id },
        select: { id: true, community_id: true, user_id: true },
      })
    : null;
  const userSummary = updated.community_platform_user_id
    ? await MyGlobal.prisma.community_platform_users.findUnique({
        where: { id: updated.community_platform_user_id },
        select: { id: true },
      })
    : null;

  return {
    id: updated.id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    post: postSummary
      ? {
          id: postSummary.id,
          community_id: postSummary.community_id,
          user_id: postSummary.user_id,
        }
      : undefined,
    user: userSummary
      ? {
          id: userSummary.id,
        }
      : undefined,
  };
}
