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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeOwnerModeratorsModeratorId(props: {
  owner: OwnerPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditLikeModerator.IUpdate;
}): Promise<IRedditLikeModerator> {
  // Find moderator and verify existence/active status
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findUnique({
    where: { id: props.moderatorId },
    select: {
      id: true,
      community_id: true,
      deleted_at: true,
    },
  });
  if (!moderator || moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found", 404);
  }
  // Verify owner owns the community
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: moderator.community_id },
    select: {
      id: true,
      owner_id: true,
      deleted_at: true,
    },
  });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update moderator permissions
  const updated = await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      can_add_moderators: (
        props.body as {
          canAddModerators?: boolean;
        }
      ).canAddModerators,
      updated_at: new Date(),
    },
    ...RedditLikeModeratorTransformer.select(),
  });
  return await RedditLikeModeratorTransformer.transform(updated);
}
