import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { IRedditGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditGuestSessionTransformer } from "../transformers/RedditGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditGuestSession> {
  const session = await MyGlobal.prisma.reddit_guest_sessions.findUniqueOrThrow(
    {
      where: { id: props.sessionId },
      ...RedditGuestSessionTransformer.select(),
    },
  );
  return await RedditGuestSessionTransformer.transform(session);
}
