import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function getEconPoliticalForumUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumRegisteredUser.ISummary> {
  const { userId } = props;

  // Fetch only necessary fields; include deleted_at for soft-delete check
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // Not found
  if (!user) throw new HttpException("Not Found", 404);

  // Soft-deleted - public callers cannot see archived accounts
  if (user.deleted_at) throw new HttpException("Not Found", 404);

  // Map nullable DB fields to optional DTO fields (null -> undefined)
  const displayName =
    user.display_name === null ? undefined : user.display_name;
  const bio = user.bio === null ? undefined : user.bio;
  const avatarUri =
    user.avatar_uri === null
      ? undefined
      : (user.avatar_uri as string & tags.Format<"uri">);

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: displayName,
    bio: bio,
    avatar_uri: avatarUri,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
