import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFeedConfigTransformer } from "../transformers/RedditCloneFeedConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFeedConfigs(): Promise<IRedditCloneFeedConfig> {
  const config = await MyGlobal.prisma.reddit_clone_feed_configs.findFirst({
    ...RedditCloneFeedConfigTransformer.select(),
  });
  if (!config) {
    throw new HttpException("Feed configuration not found", 404);
  }
  return await RedditCloneFeedConfigTransformer.transform(config);
}
