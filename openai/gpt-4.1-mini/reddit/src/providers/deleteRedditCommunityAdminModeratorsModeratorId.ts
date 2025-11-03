import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminModeratorsModeratorId(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderatorId } = props;

  await MyGlobal.prisma.reddit_community_moderator.findUniqueOrThrow({
    where: { id: moderatorId },
  });

  await MyGlobal.prisma.reddit_community_moderator.delete({
    where: { id: moderatorId },
  });
}
