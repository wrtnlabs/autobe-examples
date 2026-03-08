import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityNameModeratorsModeratorId(props: {
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  // 1. Find the community by name (must exist and not be deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 2. Find the moderator record by ID with relations
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.moderatorId },
        ...CommunityPlatformCommunityModeratorTransformer.select(),
      },
    );
  // 3. Verify moderator belongs to the specified community
  if (moderator.community.id !== community.id) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // 4. Verify moderator is not soft-deleted
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found", 404);
  }
  // 5. Transform and return
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    moderator,
  );
}
