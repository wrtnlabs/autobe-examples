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
import { RedditCommunityUserProfileTransformer } from "../transformers/RedditCommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCommunityUserProfile.IUpdate;
}): Promise<IRedditCommunityUserProfile> {
  // Find current profile
  const current =
    await MyGlobal.prisma.reddit_community_user_profiles.findUnique({
      where: { id: props.member.id },
      ...RedditCommunityUserProfileTransformer.select(),
    });
  if (!current) throw new HttpException("Profile not found", 404);
  // Validate display_name uniqueness if updated
  if (props.body.display_name !== current.display_name) {
    const exists =
      await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
        where: {
          display_name: props.body.display_name,
          id: { not: props.member.id },
          deleted_at: null,
        },
      });
    if (exists) throw new HttpException("Display name already in use", 400);
  }
  // Update record with provided fields
  const updated = await MyGlobal.prisma.reddit_community_user_profiles.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio === undefined ? current.bio : props.body.bio,
      avatar_url:
        props.body.avatar_url === undefined
          ? current.avatar_url
          : props.body.avatar_url,
      updated_at: toISOStringSafe(new Date()),
    },
    ...RedditCommunityUserProfileTransformer.select(),
  });
  return RedditCommunityUserProfileTransformer.transform(updated);
}
