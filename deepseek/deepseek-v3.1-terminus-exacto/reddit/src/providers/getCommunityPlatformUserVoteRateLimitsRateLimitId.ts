import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformVoteRateLimitTransformer } from "../transformers/CommunityPlatformVoteRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserVoteRateLimitsRateLimitId(props: {
  user: UserPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteRateLimit> {
  const rateLimit =
    await MyGlobal.prisma.community_platform_vote_rate_limits.findUniqueOrThrow(
      {
        where: {
          id: props.rateLimitId,
          community_platform_user_id: props.user.id,
        },
        ...CommunityPlatformVoteRateLimitTransformer.select(),
      },
    );
  return await CommunityPlatformVoteRateLimitTransformer.transform(rateLimit);
}
