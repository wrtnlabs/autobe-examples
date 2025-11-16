import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconomicDiscussionModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionModerator.IUpdate;
}): Promise<IEconomicDiscussionModerator> {
  // Verify the target moderator exists
  const existingModerator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!existingModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Check for username uniqueness if updating username
  if (props.body.username !== undefined) {
    const usernameConflict =
      await MyGlobal.prisma.economic_discussion_moderators.findFirst({
        where: {
          username: props.body.username,
          id: { not: props.moderatorId },
        },
      });

    if (usernameConflict) {
      throw new HttpException("Username already exists", 409);
    }
  }

  // Check for email uniqueness if updating email
  if (props.body.email !== undefined) {
    const emailConflict =
      await MyGlobal.prisma.economic_discussion_moderators.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.moderatorId },
        },
      });

    if (emailConflict) {
      throw new HttpException("Email already exists", 409);
    }
  }

  // Apply the update
  const updatedModerator =
    await MyGlobal.prisma.economic_discussion_moderators.update({
      where: { id: props.moderatorId },
      data: {
        ...props.body,
        updated_at: new Date(),
      },
    });

  return {
    id: updatedModerator.id,
    username: updatedModerator.username,
    email: updatedModerator.email,
    password_hash: updatedModerator.password_hash,
    email_verified: updatedModerator.email_verified,
    two_factor_enabled: updatedModerator.two_factor_enabled,
    moderation_level: updatedModerator.moderation_level,
    created_at: toISOStringSafe(updatedModerator.created_at),
    updated_at: toISOStringSafe(updatedModerator.updated_at),
  };
}
