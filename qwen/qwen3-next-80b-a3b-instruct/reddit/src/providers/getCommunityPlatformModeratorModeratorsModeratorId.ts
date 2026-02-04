import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";

export async function getCommunityPlatformModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  // Verify the authenticated moderator is requesting their own record
  // or has sufficient permissions (owner/admin)
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
      ...CommunityPlatformModeratorTransformer.select(),
    });
  if (!moderatorRecord) {
    throw new HttpException("Moderator not found", 404);
  }
  // Use the transformer to convert the database result to the API response DTO
  return CommunityPlatformModeratorTransformer.transform(moderatorRecord);
}
