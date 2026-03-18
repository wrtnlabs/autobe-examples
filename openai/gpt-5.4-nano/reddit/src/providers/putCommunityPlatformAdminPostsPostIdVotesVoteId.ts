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
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminPostsPostIdVotesVoteId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
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
        post: {
          select: { id: true, community_platform_posts: { select: {} } } as any,
        },
        voter: { select: { id: true } },
      },
    });
  if (vote.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      deleted_at: true,
      community_platform_post_author_id: true,
    } as any,
  });
  const actingMemberId = props.admin.id;
  if (vote.voter_id !== actingMemberId) {
    throw new HttpException("Forbidden", 403);
  }
  const nextVoteValue = props.body.voteValue;
  if (vote.deleted_at !== null) {
    await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        vote_value: nextVoteValue,
        voted_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  } else if (vote.vote_value !== nextVoteValue) {
    await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        vote_value: nextVoteValue,
        voted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  return await CommunityPlatformPostVoteTransformer.transform(updated);
}
