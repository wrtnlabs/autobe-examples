import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorGuestsGuestId(props: {
  moderator: ModeratorPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuest> {
  const guest = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: props.guestId },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  await MyGlobal.prisma.reddit_community_guests.delete({
    where: { id: props.guestId },
  });

  return {
    total_posts: 0,
    total_comments: 0,
    post_karma: 0,
    comment_karma: 0,
    total_karma: 0,
  };
}
