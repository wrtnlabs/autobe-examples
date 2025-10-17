import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";

export async function getCommunityPlatformProfilesProfileId(props: {
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfile> {
  const record =
    await MyGlobal.prisma.community_platform_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
    });
  return {
    id: record.id,
    community_platform_member_id: record.community_platform_member_id,
    username: record.username,
    bio: record.bio ?? undefined,
    avatar_uri: record.avatar_uri ?? undefined,
    display_email: record.display_email ?? undefined,
    status_message: record.status_message ?? undefined,
    is_public: record.is_public,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
