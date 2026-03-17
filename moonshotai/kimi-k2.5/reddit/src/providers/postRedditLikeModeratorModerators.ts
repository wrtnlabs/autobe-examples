import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeModeratorCollector } from "../collectors/RedditLikeModeratorCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerator.ICreate;
}): Promise<IRedditLikeModerator> {
  // Verify community exists and get owner info for authorization
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.body.communityId },
      select: { id: true, owner_id: true },
    });
  // Authorization: requester must be community owner OR moderator with can_add_moderators
  const isOwner = community.owner_id === props.moderator.id;
  if (!isOwner) {
    const requesterModerator =
      await MyGlobal.prisma.reddit_like_moderators.findFirst({
        where: {
          member_id: props.moderator.id,
          community_id: props.body.communityId,
          can_add_moderators: true,
          deleted_at: null,
        },
      });
    if (!requesterModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Prevent duplicate: check if target member is already a moderator
  const existingModerator =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.body.memberId,
        community_id: props.body.communityId,
        deleted_at: null,
      },
    });
  if (existingModerator) {
    throw new HttpException("Conflict", 409);
  }
  // Create the moderator using Collector for write side
  const collected = await RedditLikeModeratorCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.reddit_like_moderators.create({
    data: collected,
    ...RedditLikeModeratorTransformer.select(),
  });
  // Transform and return using Transformer for read side
  return await RedditLikeModeratorTransformer.transform(created);
}
