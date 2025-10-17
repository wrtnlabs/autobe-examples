import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityCommunityModeratorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;
  try {
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: { id },
      },
    );
  } catch {
    throw new HttpException("Community moderator not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: { id },
  });
}
