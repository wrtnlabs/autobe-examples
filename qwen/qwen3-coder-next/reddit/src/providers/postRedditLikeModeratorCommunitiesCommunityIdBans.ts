import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeBanCollector } from "../collectors/RedditLikeBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeBanTransformer } from "../transformers/RedditLikeBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeBan.ICreate;
}): Promise<IRedditLikeBan> {
  // Verify moderator has authority in target community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
      },
    });
  if (!moderatorRole) {
    throw new HttpException(
      "Forbidden: Not authorized for this community",
      403,
    );
  }
  // Verify target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      id: props.body.reddit_like_user_id,
      deleted_at: null,
    },
  });
  if (!targetUser) {
    throw new HttpException("Target user not found", 404);
  }
  // Verify target community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Create ban record using collector
  const ban = await MyGlobal.prisma.reddit_like_bans.create({
    data: await RedditLikeBanCollector.collect({
      body: {
        ...props.body,
        status: "active",
      },
    }),
    ...RedditLikeBanTransformer.select(),
  });
  // Return transformed ban record
  return await RedditLikeBanTransformer.transform(ban);
}
