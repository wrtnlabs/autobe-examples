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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerModerators(props: {
  owner: OwnerPayload;
  body: IRedditLikeModerator.ICreate;
}): Promise<IRedditLikeModerator> {
  // Verify community exists and get owner
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.body.communityId },
    select: { owner_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Authorization: must be owner OR moderator with can_add_moderators
  const isOwner = community.owner_id === props.owner.id;
  if (!isOwner) {
    const requesterModerator =
      await MyGlobal.prisma.reddit_like_moderators.findFirst({
        where: {
          member_id: props.owner.id,
          community_id: props.body.communityId,
          can_add_moderators: true,
          deleted_at: null,
        },
      });
    if (requesterModerator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Check for existing active moderator (database has unique constraint, but explicit check for clarity)
  const existingModerator =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.body.memberId,
        community_id: props.body.communityId,
        deleted_at: null,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // Create moderator using collector and return via transformer
  const created = await MyGlobal.prisma.reddit_like_moderators.create({
    data: await RedditLikeModeratorCollector.collect({ body: props.body }),
    ...RedditLikeModeratorTransformer.select(),
  });
  return await RedditLikeModeratorTransformer.transform(created);
}
