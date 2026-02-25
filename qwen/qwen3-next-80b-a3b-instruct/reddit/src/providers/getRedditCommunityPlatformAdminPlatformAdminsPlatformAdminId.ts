import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityPlatformAdminTransformer } from "../transformers/RedditCommunityPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminPlatformAdminsPlatformAdminId(props: {
  platformAdmin: PlatformadminPayload;
  platformAdminId: string;
}): Promise<IRedditCommunityPlatformAdmin> {
  const admin =
    await MyGlobal.prisma.reddit_community_platform_admins.findUniqueOrThrow({
      where: {
        id: props.platformAdminId,
        is_deleted: false,
      },
      ...RedditCommunityPlatformAdminTransformer.select(),
    });
  return RedditCommunityPlatformAdminTransformer.transform(admin);
}
