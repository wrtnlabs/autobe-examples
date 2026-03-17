import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityGuestUsersUserIdProfile(props: {
  guest: GuestPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserProfile.ISummary> {
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        id: props.userId,
        deleted_at: null,
      },
    });
  const created_at = toISOStringSafe(profile.created_at);
  return {
    id: profile.id,
    display_name: profile.display_name,
    bio: profile.bio ?? undefined,
    avatar_image_url: profile.avatar_image_url_id ?? undefined,
    karma_score: 0,
    created_at,
  } satisfies IRedditCommunityUserProfile.ISummary;
}
