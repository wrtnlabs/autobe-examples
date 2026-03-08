import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformGuestTransformer } from "../transformers/RedditPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformGuest> {
  const guest = await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...RedditPlatformGuestTransformer.select(),
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Gone", 410);
  }
  return await RedditPlatformGuestTransformer.transform(guest);
}
