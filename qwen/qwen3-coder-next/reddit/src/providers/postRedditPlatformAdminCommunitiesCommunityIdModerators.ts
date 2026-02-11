import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformModerationCollector } from "../collectors/RedditPlatformModerationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModerationTransformer } from "../transformers/RedditPlatformModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditPlatformModeration.ICreate;
}): Promise<IRedditPlatformModeration> {
  // Check if admin has owner or moderator privileges for the community
  const existingModeration =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
    });
  if (!existingModeration) {
    throw new HttpException(
      "Forbidden: You must be an owner or moderator of this community",
      403,
    );
  }
  // If adding an OWNER, check that no other OWNER exists
  if (props.body.role === "OWNER") {
    const existingOwner =
      await MyGlobal.prisma.reddit_platform_moderations.findFirst({
        where: {
          community_id: props.communityId,
          role: "OWNER",
        },
      });
    if (existingOwner) {
      throw new HttpException(
        "Conflict: This community already has an OWNER",
        409,
      );
    }
  }
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Validate target user exists
  const user = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: props.body.user_id },
  });
  if (!user) {
    throw new HttpException("Target user not found", 404);
  }
  // Create moderation assignment using collector
  const created = await MyGlobal.prisma.reddit_platform_moderations.create({
    data: await RedditPlatformModerationCollector.collect({
      body: {
        community_id: props.communityId,
        user_id: props.body.user_id,
        role: props.body.role,
      },
    }),
    ...RedditPlatformModerationTransformer.select(),
  });
  // Transform and return result
  return await RedditPlatformModerationTransformer.transform(created);
}
