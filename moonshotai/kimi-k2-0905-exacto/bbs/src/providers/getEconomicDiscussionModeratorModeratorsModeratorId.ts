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

export async function getEconomicDiscussionModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionModerator> {
  // Query the moderator by ID
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  // Handle not found case
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Return complete moderator information
  // All fields must conform to IEconomicDiscussionModerator interface
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    email: moderator.email,
    password_hash: moderator.password_hash,
    email_verified: moderator.email_verified,
    two_factor_enabled: moderator.two_factor_enabled,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  } as IEconomicDiscussionModerator;
}
