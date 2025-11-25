import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorModeratorsUsername(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator> {
  // Find the target moderator by username
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Check if email is being updated and verify uniqueness
  if (props.body.email && props.body.email !== targetModerator.email) {
    const existingEmail =
      await MyGlobal.prisma.discussion_board_moderators.findFirst({
        where: {
          email: props.body.email,
          deleted_at: null,
          id: { not: targetModerator.id },
        },
      });

    if (existingEmail) {
      throw new HttpException("Email already exists", 409);
    }
  }

  // Validate that at least one field is being updated
  const hasUpdates =
    props.body.email !== undefined ||
    props.body.password !== undefined ||
    props.body.display_name !== undefined ||
    props.body.bio !== undefined ||
    props.body.moderation_level !== undefined;

  if (!hasUpdates) {
    throw new HttpException("No fields provided for update", 400);
  }

  // Prepare update data with proper typing
  const updateData: Prisma.discussion_board_moderatorsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle password update if provided
  if (props.body.password) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // Handle other field updates
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }

  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }

  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }

  if (props.body.moderation_level !== undefined) {
    updateData.moderation_level = props.body.moderation_level;
  }

  // Update the moderator
  const updatedModerator =
    await MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: targetModerator.id },
      data: updateData,
    });

  // Return the updated moderator profile
  return {
    email: updatedModerator.email as string & tags.Format<"email">,
    username: updatedModerator.username,
    display_name: updatedModerator.display_name ?? undefined,
    bio: updatedModerator.bio ?? undefined,
    moderation_level: updatedModerator.moderation_level,
  };
}
