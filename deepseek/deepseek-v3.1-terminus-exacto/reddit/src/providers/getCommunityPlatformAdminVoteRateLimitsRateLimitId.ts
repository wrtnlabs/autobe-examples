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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformVoteRateLimitTransformer } from "../transformers/CommunityPlatformVoteRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformAdminVoteRateLimitsRateLimitId(props: {
  admin: AdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteRateLimit> {
  // 1. Retrieve the vote rate limit record by ID
  const voteRateLimitRecord =
    await MyGlobal.prisma.community_platform_vote_rate_limits.findUniqueOrThrow(
      {
        where: { id: props.rateLimitId },
        ...CommunityPlatformVoteRateLimitTransformer.select(),
      },
    );
  // 2. Transform the database record to response DTO format
  return await CommunityPlatformVoteRateLimitTransformer.transform(
    voteRateLimitRecord,
  );
}
