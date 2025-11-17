import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function postRedditCommunityRedditCommunityGuests(props: {
  body: IRedditCommunityGuest.ICreate;
}): Promise<IRedditCommunityGuest> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // Create with valid properties only
  await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
    },
  });

  // Fetch full created record with existing fields only
  const created = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!created) throw new Error("RedditCommunityGuest creation failed.");

  return {
    id: created.id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  } satisfies IRedditCommunityGuest;
}
