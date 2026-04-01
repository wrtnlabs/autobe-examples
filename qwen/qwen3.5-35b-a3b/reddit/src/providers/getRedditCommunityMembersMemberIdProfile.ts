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
  const profileQuery =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
      where: {
        reddit_community_user_id: props.memberId,
        deleted_at: null,
      },
    });
  if (!profileQuery) {
    throw new HttpException("Member not found", 404);
  }
  return {
    id: profileQuery.id,
    display_name: profileQuery.display_name,
    bio: profileQuery.bio ?? undefined,
    avatar_image_url: null,
    karma_score: 0,
    created_at: toISOStringSafe(profileQuery.created_at),
  } satisfies IRedditCommunityUserProfile.ISummary;
}
