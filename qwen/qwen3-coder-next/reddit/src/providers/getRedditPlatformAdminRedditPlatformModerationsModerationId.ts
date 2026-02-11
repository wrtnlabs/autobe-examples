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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModerationTransformer } from "../transformers/RedditPlatformModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminRedditPlatformModerationsModerationId(props: {
  admin: AdminPayload;
  moderationId: string;
}): Promise<IRedditPlatformModeration> {
  const moderation =
    await MyGlobal.prisma.reddit_platform_moderations.findUnique({
      where: { id: props.moderationId },
      ...RedditPlatformModerationTransformer.select(),
    });
  if (!moderation) throw new HttpException("Moderation not found", 404);
  return await RedditPlatformModerationTransformer.transform(moderation);
}
