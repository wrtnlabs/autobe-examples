import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityGuestTransformer } from "../transformers/RedditCommunityGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuest> {
  const record =
    await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow({
      where: { id: props.guestId },
      ...RedditCommunityGuestTransformer.select(),
    });
  return await RedditCommunityGuestTransformer.transform(record);
}
