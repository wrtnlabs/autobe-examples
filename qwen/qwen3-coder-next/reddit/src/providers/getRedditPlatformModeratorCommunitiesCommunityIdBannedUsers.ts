import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorCommunitiesCommunityIdBannedUsers(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditPlatformBan.ISummary> {
  const { moderator, communityId } = props;
  // Find community to verify it exists and get its ID
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if the moderator has access to this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        community_id: communityId,
        user_id: moderator.id,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  throw new HttpException("Not implemented", 501);
}
