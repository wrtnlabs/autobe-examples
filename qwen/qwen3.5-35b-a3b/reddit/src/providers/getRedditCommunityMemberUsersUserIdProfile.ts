import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberUsersUserIdProfile(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserProfile.ISummary> {
  // Find profile - returns 404 if not found or deleted (deleted_at is not null)
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        id: props.userId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        reddit_community_user_id: true,
        avatar: {
          select: { reddit_community_user_id: true },
        },
      },
    });
  // Get karma score from karma table
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
      where: { reddit_community_member_id: profile.reddit_community_user_id },
      select: { current_score: true },
    });
  const karmaScore: number & tags.Type<"int32"> = karmaRecord
    ? (karmaRecord.current_score satisfies number as number &
        tags.Type<"int32">)
    : (0 satisfies number as number & tags.Type<"int32">);
  // Resolve avatar URL from avatar file reference
  const avatarFileId = profile.avatar?.reddit_community_user_id;
  const avatarImageUrl: (string & tags.Format<"uri">) | null | undefined =
    avatarFileId
      ? (`https://cdn.reddit.local/files/${avatarFileId}` as string &
          tags.Format<"uri">)
      : undefined;
  return {
    id: profile.id,
    display_name: profile.display_name,
    bio: profile.bio ?? undefined,
    avatar_image_url: avatarImageUrl,
    karma_score: karmaScore,
    created_at: toISOStringSafe(profile.created_at),
  } satisfies IRedditCommunityUserProfile.ISummary;
}
