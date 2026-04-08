import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeUserProfileTransformer } from "../transformers/RedditLikeUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberProfile(props: {
  member: MemberPayload;
  body: IRedditLikeUserProfile.IUpdate;
}): Promise<IRedditLikeUserProfile> {
  // Find profile by member ID and check existence
  const existing = await MyGlobal.prisma.reddit_like_user_profiles.findUnique({
    where: { reddit_like_member_id: props.member.id },
    select: { id: true, deleted_at: true },
  });
  // Profile not found
  if (existing === null) {
    throw new HttpException("Profile not found", 404);
  }
  // Profile is soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Profile has been deleted", 410);
  }
  // Update profile with provided fields
  await MyGlobal.prisma.reddit_like_user_profiles.update({
    where: { id: existing.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar !== undefined && { avatar: props.body.avatar }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Fetch updated profile with all fields
  const updated =
    await MyGlobal.prisma.reddit_like_user_profiles.findUniqueOrThrow({
      where: { id: existing.id },
      ...RedditLikeUserProfileTransformer.select(),
    });
  return await RedditLikeUserProfileTransformer.transform(updated);
}
