import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function putRedditCommunityRedditCommunityGuestsId(props: {
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest> {
  // Check for existing entity
  const existing = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Guest user not found", 404);
  }

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Update only valid properties existing in Prisma update input
  const updated = await MyGlobal.prisma.reddit_community_guests.update({
    where: { id: props.id },
    data: {
      updated_at: now,
    },
  });

  // Return the updated guest with date fields converted using toISOStringSafe
  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
