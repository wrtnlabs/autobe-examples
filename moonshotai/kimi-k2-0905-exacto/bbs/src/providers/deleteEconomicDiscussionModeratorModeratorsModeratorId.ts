import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Prevent self-deletion
  if (props.moderator.id === props.moderatorId) {
    throw new HttpException("Cannot delete your own account", 400);
  }

  // Verify the target moderator exists before attempting deletion
  const targetModerator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Perform the hard delete
  await MyGlobal.prisma.economic_discussion_moderators.delete({
    where: { id: props.moderatorId },
  });
}
