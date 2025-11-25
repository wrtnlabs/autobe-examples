import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorVotingRateLimitsVotingRateLimitId(props: {
  administrator: AdministratorPayload;
  votingRateLimitId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVotingRateLimit> {
  const record =
    await MyGlobal.prisma.community_platform_voting_rate_limits.findUnique({
      where: { id: props.votingRateLimitId },
      include: {
        user: true,
      },
    });

  if (!record) {
    throw new HttpException("Voting rate limit record not found", 404);
  }

  return {
    id: record.id,
    user: record.user
      ? { id: record.user.id }
      : record.user === null
        ? null
        : undefined,
    ip: Object.prototype.hasOwnProperty.call(record, "ip")
      ? record.ip === null
        ? null
        : record.ip
      : undefined,
    window_start: toISOStringSafe(record.window_start),
    window_end: toISOStringSafe(record.window_end),
    vote_count: record.vote_count,
    violation_count: record.violation_count,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
