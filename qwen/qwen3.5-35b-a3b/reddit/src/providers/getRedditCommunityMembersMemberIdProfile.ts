import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMembersMemberIdProfile(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserProfile.ISummary> {
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        id: props.memberId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        avatar_image_url_id: true,
        reddit_community_user_id: true,
        avatar: {
          select: { reddit_community_user_id: true },
        },
      },
    });
  const totalKarma = await MyGlobal.prisma.reddit_community_user_karmas
    .findMany({
      where: {
        reddit_community_member_id: profile.reddit_community_user_id,
      },
    })
    .then((karmas) =>
      karmas.reduce(
        (
          sum: number,
          karma: {
            current_score: number;
          },
        ) => sum + karma.current_score,
        0,
      ),
    );
  const avatarImageUrl = profile.avatar_image_url_id
    ? `https://cdn.reddit.local/files/${profile.avatar_image_url_id}`
    : null;
  return {
    id: profile.id,
    display_name: profile.display_name,
    bio: profile.bio ?? undefined,
    avatar_image_url: avatarImageUrl ?? undefined,
    karma_score: totalKarma,
    created_at: toISOStringSafe(profile.created_at),
  } satisfies IRedditCommunityUserProfile.ISummary;
}
