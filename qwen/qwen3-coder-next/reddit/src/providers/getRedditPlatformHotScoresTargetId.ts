import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformHotScoreCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformHotScoreCach";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformHotScoreCachTransformer } from "../transformers/RedditPlatformHotScoreCachTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformHotScoresTargetId(props: {
  targetId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformHotScoreCach> {
  const cache =
    await MyGlobal.prisma.reddit_platform_hot_score_caches.findUnique({
      where: { target_id: props.targetId },
      ...RedditPlatformHotScoreCachTransformer.select(),
    });
  if (!cache) throw new HttpException("Hot score cache not found", 404);
  return await RedditPlatformHotScoreCachTransformer.transform(cache);
}
