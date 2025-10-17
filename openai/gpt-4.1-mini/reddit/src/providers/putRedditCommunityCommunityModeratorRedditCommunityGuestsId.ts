import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function putRedditCommunityCommunityModeratorRedditCommunityGuestsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest> {
  const { id, body } = props;

  const existing = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id },
    select: { id: true },
  });

  if (existing === null) {
    throw new HttpException("Guest not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_guests.update({
    where: { id },
    data: {
      session_id: body.session_id ?? undefined,
      ip_address: body.ip_address ?? undefined,
      user_agent:
        body.user_agent === null ? null : (body.user_agent ?? undefined),
      updated_at: now,
    },
    select: {
      id: true,
      session_id: true,
      ip_address: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id,
    session_id: updated.session_id,
    ip_address: updated.ip_address,
    user_agent: updated.user_agent ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
