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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest> {
  const { admin, guestId, body } = props;

  await MyGlobal.prisma.reddit_community_guest.findUniqueOrThrow({
    where: { id: guestId },
  });

  const updated = await MyGlobal.prisma.reddit_community_guest.update({
    where: { id: guestId },
    data: {
      created_at: body.created_at
        ? toISOStringSafe(body.created_at)
        : undefined,
    },
  });

  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
  };
}
