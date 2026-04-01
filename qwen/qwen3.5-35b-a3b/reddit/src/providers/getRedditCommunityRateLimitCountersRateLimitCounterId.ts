import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityRateLimitCounterTransformer } from "../transformers/RedditCommunityRateLimitCounterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityRateLimitCountersRateLimitCounterId(props: {
  rateLimitCounterId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityRateLimitCounter> {
  const counter =
    await MyGlobal.prisma.reddit_community_rate_limit_counters.findUniqueOrThrow(
      {
        where: { id: props.rateLimitCounterId },
        ...RedditCommunityRateLimitCounterTransformer.select(),
      },
    );
  return await RedditCommunityRateLimitCounterTransformer.transform(counter);
}
