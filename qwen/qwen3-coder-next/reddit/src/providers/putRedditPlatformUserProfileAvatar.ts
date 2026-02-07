import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformUserProfileAvatar(props: {
  user: UserPayload;
  body: IRedditPlatformUserProfile.IUpdate;
}): Promise<IRedditPlatformUserProfile> {
  const updatedProfile =
    await MyGlobal.prisma.reddit_platform_user_profiles.update({
      where: { user_id: props.user.id },
      data: {
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  return {
    id: updatedProfile.id,
    user_id: updatedProfile.user_id,
    display_name: updatedProfile.display_name,
    bio: updatedProfile.bio,
    avatar_url: updatedProfile.avatar_url,
    created_at: toISOStringSafe(updatedProfile.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedProfile.updated_at) as string &
      tags.Format<"date-time">,
  };
}
