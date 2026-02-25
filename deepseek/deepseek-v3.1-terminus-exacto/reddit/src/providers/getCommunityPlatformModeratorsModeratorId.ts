import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorsModeratorId(props: {
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...CommunityPlatformModeratorTransformer.select(),
    });
  return await CommunityPlatformModeratorTransformer.transform(moderator);
}
