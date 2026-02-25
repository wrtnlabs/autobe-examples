import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityModeratorCollector } from "../collectors/RedditCommunityModeratorCollector";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityModeratorTransformer } from "../transformers/RedditCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminCommunityModerators(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator> {
  // 1. Ensure community exists and get owner_id
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.body.community_id },
      select: { owner_user_id: true },
    });
  // 2. Ensure target user exists and is not the owner
  const user = await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow(
    {
      where: { id: props.body.user_id },
      select: { id: true },
    },
  );
  if (user.id === community.owner_user_id) {
    throw new HttpException("Cannot assign community owner as moderator", 400);
  }
  // 3. Check if user is already a moderator
  const existing = await MyGlobal.prisma.reddit_community_moderators.findUnique(
    {
      where: {
        user_id_community_id: {
          user_id: props.body.user_id,
          community_id: props.body.community_id,
        },
      },
    },
  );
  if (existing) {
    throw new HttpException(
      "User is already a moderator of this community",
      400,
    );
  }
  // 4. Create moderator assignment using collector
  const createInput = await RedditCommunityModeratorCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.reddit_community_moderators.create({
    data: createInput,
    ...RedditCommunityModeratorTransformer.select(),
  });
  // 5. Transform result and return
  return await RedditCommunityModeratorTransformer.transform(created);
}
