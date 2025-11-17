import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function getRedditCommunityRedditCommunityGuestsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuest> {
  const guest = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: props.id },
  });

  if (!guest) {
    throw new HttpException("Reddit community guest not found", 404);
  }

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
