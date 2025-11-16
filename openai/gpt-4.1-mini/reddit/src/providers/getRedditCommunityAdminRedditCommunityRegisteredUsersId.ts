import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityRegisteredUsersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityRegisteredUser> {
  const user =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        email: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!user) {
    throw new HttpException("Registered user not found", 404);
  }

  return {
    id: user.id,
    username: "",
    email: user.email,
    display_name: null,
    bio: null,
    avatar_url: null,
    status: "active",
    role: "",
    registered_at: toISOStringSafe(user.created_at),
    last_login_at: null,
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
