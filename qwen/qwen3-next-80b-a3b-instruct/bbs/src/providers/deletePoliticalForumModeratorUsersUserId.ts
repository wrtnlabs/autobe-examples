import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deletePoliticalForumModeratorUsersUserId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.political_forum_citizens.delete({
    where: { id: props.userId },
  });

  if (!deleted) {
    throw new HttpException("Citizen user not found", 404);
  }
}
