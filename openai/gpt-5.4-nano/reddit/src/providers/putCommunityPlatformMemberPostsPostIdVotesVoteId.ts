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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const existing =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: { id: props.voteId },
      select: {
        id: true,
        community_platform_post_id: true,
        voter_id: true,
        vote_value: true,
        voted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: { select: { id: true } },
      },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.voter_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  if (existing.vote_value === props.body.voteValue) {
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        updated_at: now,
      },
    });
    return updated as unknown as ICommunityPlatformPostVote;
  }
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.voteId },
    data: {
      vote_value: props.body.voteValue,
      voted_at: now,
      updated_at: now,
    },
  });
  const refreshed =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
    });
  return refreshed as unknown as ICommunityPlatformPostVote;
}
