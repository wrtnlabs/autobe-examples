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
  // Verify requesting moderator has permission to add moderators
  // by checking if they are the owner or have can_add_moderators permission
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.body.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if requester is the owner
  const isOwner = community.owner_id === props.moderator.id;
  // If not owner, check if requester has can_add_moderators permission
  if (!isOwner) {
    const requesterModerator =
      await MyGlobal.prisma.reddit_like_moderators.findFirst({
        where: {
          member_id: props.moderator.id,
          community_id: props.body.communityId,
          can_add_moderators: true,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (requesterModerator === null) {
      throw new HttpException(
        "Forbidden - insufficient permissions to add moderators",
        403,
      );
    }
  }
  // Check if target member already is a moderator in this community
  const existingModerator =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.body.memberId,
        community_id: props.body.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException(
      "This user is already a moderator in this community",
      409,
    );
  }
  // Create the moderator role
  const created = await MyGlobal.prisma.reddit_like_moderators.create({
    data: await RedditLikeModeratorCollector.collect({
      body: props.body,
    }),
    ...RedditLikeModeratorTransformer.select(),
  });
  return await RedditLikeModeratorTransformer.transform(created);
}
