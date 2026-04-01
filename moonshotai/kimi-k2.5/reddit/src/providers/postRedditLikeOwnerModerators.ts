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
  // Verify community exists and check ownership
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.body.communityId },
      select: { id: true, owner_id: true },
    });
  if (community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prevent adding owner as moderator
  if (props.body.memberId === community.owner_id) {
    throw new HttpException("Owner cannot be added as moderator", 400);
  }
  // Verify target member exists
  await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.body.memberId },
  });
  // Check for existing moderator role
  const existing = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.body.memberId,
      community_id: props.body.communityId,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // Create using collector and transform result
  const created = await MyGlobal.prisma.reddit_like_moderators.create({
    data: await RedditLikeModeratorCollector.collect({ body: props.body }),
    ...RedditLikeModeratorTransformer.select(),
  });
  return await RedditLikeModeratorTransformer.transform(created);
}
