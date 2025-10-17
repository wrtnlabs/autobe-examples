import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditLikeMemberUsersUserIdPrivacy(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IUpdatePrivacy;
}): Promise<IRedditLikeUser.IPrivacySettings> {
  const { member, userId, body } = props;

  // CRITICAL AUTHORIZATION: Only the profile owner can update their own privacy settings
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own privacy settings",
      403,
    );
  }

  // Prepare current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update privacy settings with only provided fields
  const updated = await MyGlobal.prisma.reddit_like_users.update({
    where: { id: userId },
    data: {
      profile_privacy: body.profile_privacy ?? undefined,
      show_karma_publicly: body.show_karma_publicly ?? undefined,
      show_subscriptions_publicly:
        body.show_subscriptions_publicly ?? undefined,
      updated_at: now,
    },
  });

  // Return updated privacy settings
  return {
    profile_privacy: updated.profile_privacy,
    show_karma_publicly: updated.show_karma_publicly,
    show_subscriptions_publicly: updated.show_subscriptions_publicly,
  };
}
