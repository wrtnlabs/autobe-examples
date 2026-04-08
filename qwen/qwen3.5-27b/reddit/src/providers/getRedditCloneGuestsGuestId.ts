import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneGuestTransformer } from "../transformers/RedditCloneGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneGuest> {
  const record = await MyGlobal.prisma.reddit_clone_guests.findFirstOrThrow({
    ...RedditCloneGuestTransformer.select(),
    where: {
      id: props.guestId,
      deleted_at: null,
    },
  });
  return await RedditCloneGuestTransformer.transform(record);
}
