import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMembersMemberId(props: {
  memberId: string;
}): Promise<IRedditCommunityMember.IProfile> {
  const user = await MyGlobal.prisma.reddit_community_users.findFirstOrThrow({
    where: {
      username: props.memberId,
      is_deleted: false,
    },
    select: {
      id: true,
      username: true,
      created_at: true,
      profile: {
        select: {
          display_name: true,
          bio: true,
          avatar_image_url_id: true,
        },
      },
    },
  });
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirst({
      where: { reddit_community_member_id: user.id },
      select: { current_score: true },
    });
  const avatarFile = user.profile?.avatar_image_url_id
    ? await MyGlobal.prisma.reddit_community_file_of_users.findFirst({
        where: {
          reddit_community_file_id: user.profile.avatar_image_url_id,
        },
        select: { file: { select: { file_path: true } } },
      })
    : null;
  return {
    username: user.username,
    display_name: user.profile?.display_name ?? undefined,
    bio: user.profile?.bio ?? undefined,
    avatar_image_url: avatarFile?.file?.file_path ?? null,
    karma: (karmaRecord?.current_score ?? 0) satisfies number &
      tags.Type<"int32">,
    created_at: user.created_at.toISOString(),
  } satisfies IRedditCommunityMember.IProfile;
}
