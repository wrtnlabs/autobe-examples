import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function getCommunityPortalUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalUser> {
  const { userId } = props;

  try {
    const user = await MyGlobal.prisma.community_portal_users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at !== null) {
      throw new HttpException("User not found", 404);
    }

    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name ?? undefined,
      bio: user.bio ?? undefined,
      avatar_uri: user.avatar_uri ?? undefined,
      karma: user.karma,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
