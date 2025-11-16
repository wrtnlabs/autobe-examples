import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityRegisteredUsersId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUser.IUpdate;
}): Promise<IRedditCommunityRegisteredUser> {
  if (props.registeredUser.id !== props.id) {
    throw new HttpException("Forbidden", 403);
  }

  const user =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.id },
    });

  if (user === null || user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  const now = toISOStringSafe(new Date(Date.now()));

  const updated =
    await MyGlobal.prisma.reddit_community_registered_users.update({
      where: { id: props.id },
      data: {
        email: props.body.email ?? undefined,
        updated_at: now,
      },
    });

  const freshUser =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.id },
    });

  if (freshUser === null) {
    throw new HttpException("User not found after update", 404);
  }

  return {
    id: freshUser.id,
    username: "",
    email: freshUser.email,
    display_name: "",
    bio: "",
    avatar_url: "",
    status: "active",
    role: "",
    registered_at: toISOStringSafe(freshUser.created_at),
    last_login_at: null,
    deleted_at:
      freshUser.deleted_at !== null
        ? toISOStringSafe(freshUser.deleted_at)
        : null,
    created_at: toISOStringSafe(freshUser.created_at),
    updated_at: toISOStringSafe(freshUser.updated_at),
  };
}
