import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminKarmaAwardsKarmaAwardId(props: {
  admin: AdminPayload;
  karmaAwardId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaAward> {
  const record =
    await MyGlobal.prisma.community_platform_karma_awards.findUniqueOrThrow({
      where: { id: props.karmaAwardId },
    });
  return {
    id: record.id,
    community_platform_member_id: record.community_platform_member_id,
    community_platform_community_id:
      record.community_platform_community_id === null
        ? undefined
        : record.community_platform_community_id,
    award_type: record.award_type,
    award_reason: record.award_reason ?? undefined,
    event_time: toISOStringSafe(record.event_time),
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
