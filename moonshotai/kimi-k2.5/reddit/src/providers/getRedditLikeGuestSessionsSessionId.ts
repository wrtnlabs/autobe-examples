import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeGuestSessionTransformer } from "../transformers/RedditLikeGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeGuestSession> {
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.findUnique({
    where: { id: props.sessionId },
    ...RedditLikeGuestSessionTransformer.select(),
  });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  if (session.reddit_like_guest_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 404);
  }
  return RedditLikeGuestSessionTransformer.transform(session);
}
