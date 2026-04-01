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
  // Query profile with karma and avatar relations
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        id: props.userId,
        deleted_at: null, // Only active profiles
      },
      include: {
        user: { select: { id: true } },
        avatar: {
          include: {
            file: { select: { file_path: true } },
          },
        },
      },
    });
  // Get karma score from karma table
  const karma = await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
    where: {
      reddit_community_member_id: profile.reddit_community_user_id,
    },
  });
  const karmaScore = karma?.current_score ?? 0;
  // Transform to DTO format with proper date-time string
  const avatarImagePath = profile.avatar?.file?.file_path;
  const avatarImageUrl: (string & tags.Format<"uri">) | null =
    avatarImagePath ?? null;
  return {
    id: profile.id,
    display_name: profile.display_name,
    bio: profile.bio ?? undefined,
    avatar_image_url: avatarImageUrl,
    karma_score: karmaScore,
    created_at: toISOStringSafe(profile.created_at) as string &
      tags.Format<"date-time">,
  };
}
