import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserTransformer } from "../transformers/DiscussionBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserUsersProfile(props: {
  user: UserPayload;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  // Validate that at least one field is provided
  if (props.body.display_name === undefined && props.body.bio === undefined) {
    throw new HttpException("No fields to update", 400);
  }
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    const displayName = props.body.display_name.trim();
    if (displayName.length === 0) {
      throw new HttpException("Display name cannot be empty", 400);
    }
    if (displayName.length < 2 || displayName.length > 50) {
      throw new HttpException(
        "Display name must be between 2 and 50 characters",
        400,
      );
    }
    // Check if display_name is unique (excluding current user)
    const existingUserWithName =
      await MyGlobal.prisma.discussion_board_users.findFirst({
        where: {
          display_name: displayName,
          id: { not: props.user.id },
          deleted_at: null,
        },
      });
    if (existingUserWithName) {
      throw new HttpException("Display name is already taken", 400);
    }
  }
  // Validate bio if provided
  if (
    props.body.bio !== undefined &&
    props.body.bio !== null &&
    props.body.bio.length > 500
  ) {
    throw new HttpException("Bio cannot exceed 500 characters", 400);
  }
  // Check if user exists and is not deleted
  const existingUser = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  // Build update data object
  const updateData: Prisma.discussion_board_usersUpdateInput = {
    updated_at: new Date(),
  };
  // Add display_name if provided (trim whitespace)
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name.trim();
  }
  // Add bio if provided (handle null explicitly)
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  // Update the user record
  const updatedUser = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.user.id },
    data: updateData,
    ...DiscussionBoardUserTransformer.select(),
  });
  // Transform and return the result
  return DiscussionBoardUserTransformer.transform(updatedUser);
}
