import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityRedditCommunityGuestsRedditCommunityGuestIdSessionsId(props: {
  redditCommunityGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_guest_sessions.findUnique({
      where: {
        reddit_community_guest_id: props.redditCommunityGuestId,
        id: props.id,
      },
    });

  if (!existing) {
    throw new HttpException("Guest session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_guest_sessions.delete({
    where: {
      reddit_community_guest_id: props.redditCommunityGuestId,
      id: props.id,
    },
  });
}
