import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putCommunityPlatformUserProfile(props: {
  user: UserPayload;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  const userRecord = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.user.id },
  });
  if (!userRecord || userRecord.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }
  const updatedUser = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.user.id },
    data: {
      display_name:
        "display_name" in props.body
          ? (props.body as any).display_name
          : userRecord.display_name,
      bio: "bio" in props.body ? (props.body as any).bio : userRecord.bio,
      avatar_url:
        "avatar_url" in props.body
          ? (props.body as any).avatar_url
          : userRecord.avatar_url,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Log the update action for audit
  console.log(
    `User profile updated: ${props.user.id} at ${updatedUser.updated_at}`,
  );
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    display_name: updatedUser.display_name,
    bio: updatedUser.bio === null ? undefined : updatedUser.bio,
    avatar_url:
      updatedUser.avatar_url === null ? undefined : updatedUser.avatar_url,
    karma: updatedUser.karma,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
    deleted_at:
      updatedUser.deleted_at === null ? undefined : updatedUser.deleted_at,
  };
}
