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

export async function postCommunityPlatformAdminKarmaAwards(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaAward.ICreate;
}): Promise<ICommunityPlatformKarmaAward> {
  const {
    community_platform_member_id,
    community_platform_community_id,
    award_type,
    award_reason,
    event_time,
  } = props.body;

  // Validate referenced member existence
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: community_platform_member_id,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Member does not exist.", 404);
  }

  // Validate community existence (if provided and not null)
  if (
    community_platform_community_id !== undefined &&
    community_platform_community_id !== null
  ) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: community_platform_community_id,
          deleted_at: null,
        },
      });
    if (!community) {
      throw new HttpException("Community does not exist.", 404);
    }
  }

  // Insert award
  const created = await MyGlobal.prisma.community_platform_karma_awards.create({
    data: {
      id: v4(),
      community_platform_member_id,
      community_platform_community_id: community_platform_community_id ?? null,
      award_type,
      award_reason: award_reason ?? null,
      event_time,
      created_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    community_platform_member_id: created.community_platform_member_id,
    community_platform_community_id:
      created.community_platform_community_id ?? null,
    award_type: created.award_type,
    award_reason: created.award_reason ?? null,
    event_time: toISOStringSafe(created.event_time),
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
