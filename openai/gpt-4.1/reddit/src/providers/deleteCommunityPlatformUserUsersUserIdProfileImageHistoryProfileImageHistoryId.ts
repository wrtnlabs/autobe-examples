import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileImageHistoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Retrieve the profile image history record for this user
  const record =
    await MyGlobal.prisma.community_platform_profile_image_history.findUnique({
      where: {
        id: props.profileImageHistoryId,
        community_platform_user_id: props.userId,
      },
    });

  if (!record) {
    throw new HttpException(
      "Profile image history record not found or not owned by this user",
      404,
    );
  }

  // Step 2: (Removed active profile image reference check - not supported by schema)

  // Step 3: Perform the deletion
  await MyGlobal.prisma.community_platform_profile_image_history.delete({
    where: {
      id: props.profileImageHistoryId,
    },
  });
}
