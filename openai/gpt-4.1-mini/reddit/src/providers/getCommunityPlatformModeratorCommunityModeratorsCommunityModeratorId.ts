import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformModeratorCommunityModeratorsCommunityModeratorId(props: {
  moderator: ModeratorPayload;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const record =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.communityModeratorId },
    });
  if (!record) {
    throw new HttpException("Community moderator not found", 404);
  }
  return record;
}
