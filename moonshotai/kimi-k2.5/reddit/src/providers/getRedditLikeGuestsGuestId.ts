import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeGuestTransformer } from "../transformers/RedditLikeGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeGuest> {
  const guest = await MyGlobal.prisma.reddit_like_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...RedditLikeGuestTransformer.select(),
  });
  return await RedditLikeGuestTransformer.transform(guest);
}
