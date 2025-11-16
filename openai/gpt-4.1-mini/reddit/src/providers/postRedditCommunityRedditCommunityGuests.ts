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
  const id = v4();
  const session_id = v4();
  const now = new Date();
  const createdAt = toISOStringSafe(now);

  const created = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    session_id,
    ip_address: props.body.ip_address ?? "",
    user_agent: props.body.user_agent ?? undefined,
    device_type: props.body.device_type ?? undefined,
    created_at: createdAt,
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
  };
}
