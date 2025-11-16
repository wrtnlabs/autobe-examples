import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAbuseFlag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorVotingAbuseFlagsVotingAbuseFlagId(props: {
  administrator: AdministratorPayload;
  votingAbuseFlagId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVotingAbuseFlag> {
  const flag =
    await MyGlobal.prisma.community_platform_voting_abuse_flags.findUnique({
      where: { id: props.votingAbuseFlagId },
    });
  if (!flag) {
    throw new HttpException("Voting abuse flag not found", 404);
  }
  return {
    id: flag.id,
    community_platform_user_id:
      flag.community_platform_user_id === null ||
      typeof flag.community_platform_user_id === "undefined"
        ? undefined
        : flag.community_platform_user_id,
    ip:
      flag.ip === null || typeof flag.ip === "undefined" ? undefined : flag.ip,
    violation_type: flag.violation_type,
    status: flag.status,
    note:
      flag.note === null || typeof flag.note === "undefined"
        ? undefined
        : flag.note,
    created_at: toISOStringSafe(flag.created_at),
    resolved_at:
      flag.resolved_at === null || typeof flag.resolved_at === "undefined"
        ? undefined
        : toISOStringSafe(flag.resolved_at),
  };
}
