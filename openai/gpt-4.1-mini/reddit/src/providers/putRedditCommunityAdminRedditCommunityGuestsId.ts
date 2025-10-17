import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityGuestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest> {
  const { id, body } = props;

  await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow({
    where: { id },
  });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_guests.update({
    where: { id },
    data: {
      session_id: body.session_id ?? undefined,
      ip_address: body.ip_address ?? undefined,
      user_agent: body.user_agent === undefined ? undefined : body.user_agent,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    session_id: updated.session_id,
    ip_address: updated.ip_address,
    user_agent: updated.user_agent ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
