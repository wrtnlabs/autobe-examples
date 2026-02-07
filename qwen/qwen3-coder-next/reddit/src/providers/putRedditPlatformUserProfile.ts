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

export async function putRedditPlatformUserProfile(props: {
  user: UserPayload;
  body: IRedditPlatformUserProfile.IUpdate;
}): Promise<IRedditPlatformUserProfile> {
  const profile =
    await MyGlobal.prisma.reddit_platform_user_profiles.findUnique({
      where: { user_id: props.user.id },
    });
  if (!profile) {
    throw new HttpException("User profile not found", 404);
  }
  const updated = await MyGlobal.prisma.reddit_platform_user_profiles.update({
    where: { user_id: props.user.id },
    data: {},
  });
  return {
    id: updated.id,
    user_id: updated.user_id,
    display_name: updated.display_name,
    bio: updated.bio === null ? undefined : updated.bio,
    avatar_url: updated.avatar_url === null ? undefined : updated.avatar_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
