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

export async function patchCommunityPlatformAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<ICommunityPlatformPostVote> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  void post;
  const voter = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (!voter) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: props.postId,
        voter_id: voter.id,
        deleted_at: null,
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  const desiredVoteValue =
    props.body.voteDirection === "upvote"
      ? 1
      : props.body.voteDirection === "downvote"
        ? -1
        : 0;
  if (props.body.voteDirection === "neutral") {
    if (!existing) {
      throw new HttpException("No active vote to remove", 400);
    }
    const removed = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existing.id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
    return await CommunityPlatformPostVoteTransformer.transform(removed);
  }
  if (existing) {
    if (existing.vote_value === desiredVoteValue) {
      return await CommunityPlatformPostVoteTransformer.transform(existing);
    }
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existing.id },
      data: {
        vote_value: desiredVoteValue,
        voted_at: new Date(),
        updated_at: new Date(),
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
    return await CommunityPlatformPostVoteTransformer.transform(updated);
  }
  const created = await MyGlobal.prisma.community_platform_post_votes.create({
    data: {
      id: v4(),
      community_platform_post_id: props.postId,
      voter_id: voter.id,
      vote_value: desiredVoteValue,
      voted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...CommunityPlatformPostVoteTransformer.select(),
  });
  return await CommunityPlatformPostVoteTransformer.transform(created);
}
