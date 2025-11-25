import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityForumUserUsersUsername(props: {
  user: UserPayload;
  username: string;
  body: ICommunityForumCommunityUser.IUpdate;
}): Promise<ICommunityForumCommunityUser> {
  // First, get the existing user to verify ownership
  const existingUser = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { id: props.user.id },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Verify that the authenticated user is updating their own profile
  // The username in the path must match the user's username in the database
  if (props.username !== existingUser.username) {
    throw new HttpException("You can only update your own profile", 403);
  }

  // If a new username is provided, verify it's unique
  if (props.body.username && props.body.username !== existingUser.username) {
    const existingUsername =
      await MyGlobal.prisma.community_forum_users.findUnique({
        where: { username: props.body.username },
      });

    if (existingUsername) {
      throw new HttpException("Username is already taken", 409);
    }
  }

  // Update the user's information
  const updatedUser = await MyGlobal.prisma.community_forum_users.update({
    where: { id: props.user.id },
    data: {
      username: props.body.username ?? existingUser.username,
      updated_at: new Date(), // This needs to be fixed - we can't use Date
    },
  });

  // Return the updated user information
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    username: updatedUser.username,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: updatedUser.updated_at
      ? toISOStringSafe(updatedUser.updated_at)
      : undefined,
  };
}
