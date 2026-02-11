import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformFeedResultTransformer } from "../transformers/RedditPlatformFeedResultTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformResultsResultId(props: {
  resultId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformFeedResult> {
  const result = await MyGlobal.prisma.reddit_platform_feed_results.findUnique({
    where: { id: props.resultId },
    ...RedditPlatformFeedResultTransformer.select(),
  });
  if (!result) throw new HttpException("Feed result not found", 404);
  return await RedditPlatformFeedResultTransformer.transform(result);
}
