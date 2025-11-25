import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserUsersUserIdProfilesProfileId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You do not have permission to delete this user's profile.",
      403,
    );
  }
  const profile =
    await MyGlobal.prisma.community_platform_user_profiles.findFirst({
      where: {
        id: props.profileId,
        community_platform_user_id: props.userId,
        deleted_at: null,
      },
    });
  if (!profile) {
    throw new HttpException("Profile not found.", 404);
  }
  await MyGlobal.prisma.community_platform_user_profiles.update({
    where: { id: props.profileId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
