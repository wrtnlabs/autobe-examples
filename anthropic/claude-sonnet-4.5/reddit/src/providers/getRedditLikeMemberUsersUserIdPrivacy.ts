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

export async function getRedditLikeMemberUsersUserIdPrivacy(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeUser.IPrivacySettings> {
  const { member, userId } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own privacy settings",
      403,
    );
  }

  const user = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: {
      profile_privacy: true,
      show_karma_publicly: true,
      show_subscriptions_publicly: true,
    },
  });

  if (!user) {
    throw new HttpException("User not found or account has been deleted", 404);
  }

  return {
    profile_privacy: user.profile_privacy,
    show_karma_publicly: user.show_karma_publicly,
    show_subscriptions_publicly: user.show_subscriptions_publicly,
  };
}
