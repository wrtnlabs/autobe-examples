import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function postRedditCommunityGuests(props: {
  body: IRedditCommunityGuest.ICreate;
}): Promise<IRedditCommunityGuest> {
  const id = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(
    new Date(),
  ); /* string & tags.Format<'date-time'> */

  const created = await MyGlobal.prisma.reddit_community_guest.create({
    data: {
      id,
      created_at: createdAt,
    },
  });

  return {
    id: created.id,
    created_at: createdAt,
  };
}
