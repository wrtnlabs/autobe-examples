import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneUsersMe(): Promise<IRedditCloneMember> {
  // Retrieve current user from session using JWT token
  const authHeader = process.env.AUTH_HEADER
    ? process.env.AUTH_HEADER
    : "Authorization";
  const token = process.env.TOKEN || "";
  if (!token) {
    throw new HttpException("Unauthorized", 401);
  }
  // Decode JWT token to get user ID
  let userId: string;
  try {
    const decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY);
    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      userId = decoded.id as string;
    } else {
      throw new HttpException("Unauthorized", 401);
    }
  } catch (error) {
    throw new HttpException("Unauthorized", 401);
  }
  // Fetch user data from database
  const user = await MyGlobal.prisma.reddit_clone_members.findUnique({
    where: { id: userId as string & tags.Format<"uuid">, deleted_at: null },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      karma: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Transform to response DTO
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email,
    username: user.username,
    displayName: user.display_name ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatar_url ?? null,
    karma: user.karma?.karma_score ?? 0,
    createdAt: user.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: user.updated_at
      ? (user.updated_at.toISOString() as string & tags.Format<"date-time">)
      : undefined,
    deletedAt: user.deleted_at
      ? (user.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
  };
}
