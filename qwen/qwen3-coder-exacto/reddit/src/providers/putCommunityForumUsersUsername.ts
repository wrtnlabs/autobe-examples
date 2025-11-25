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

export async function putCommunityForumUsersUsername(props: {
  user: UserPayload;
  username: string;
  body: ICommunityForumCommunityUser.IUpdate;
}): Promise<ICommunityForumCommunityUser> {
  // Verify that the authenticated user is updating their own profile
  if (props.user.type !== "user") {
    throw new HttpException(
      "Unauthorized: Only users can update their profiles",
      403,
    );
  }

  // Find the user by username
  const existingUser = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      username: props.username,
    },
  });

  // Check if user exists
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Verify that the authenticated user is updating their own profile
  if (existingUser.id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // If username is being updated, validate it follows platform requirements
  if (props.body.username && props.body.username !== existingUser.username) {
    // Check if username follows 3-21 character limit with alphanumeric and underscores
    if (props.body.username.length < 3 || props.body.username.length > 21) {
      throw new HttpException(
        "Username must be between 3 and 21 characters",
        400,
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(props.body.username)) {
      throw new HttpException(
        "Username can only contain alphanumeric characters and underscores",
        400,
      );
    }

    // Check for uniqueness
    const usernameExists =
      await MyGlobal.prisma.community_forum_users.findUnique({
        where: {
          username: props.body.username,
        },
      });

    if (usernameExists) {
      throw new HttpException("Username already exists", 409);
    }
  }

  // Prepare update data, omitting sensitive fields
  const updateData: Prisma.community_forum_usersUpdateInput = {
    ...(props.body.username && { username: props.body.username }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform the update
  const updatedUser = await MyGlobal.prisma.community_forum_users.update({
    where: {
      id: existingUser.id,
    },
    data: updateData,
  });

  // Return the updated user profile
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
