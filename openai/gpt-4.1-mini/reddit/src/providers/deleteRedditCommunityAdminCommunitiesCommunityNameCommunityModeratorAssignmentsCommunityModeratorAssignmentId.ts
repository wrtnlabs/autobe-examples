import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityNameCommunityModeratorAssignmentsCommunityModeratorAssignmentId(props: {
  admin: AdminPayload;
  communityName: string;
  communityModeratorAssignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const assignment =
    await MyGlobal.prisma.reddit_community_community_moderator_assignments.findUnique(
      {
        where: { id: props.communityModeratorAssignmentId },
      },
    );

  if (!assignment) {
    throw new HttpException("Community moderator assignment not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderator_assignments.delete(
    {
      where: { id: props.communityModeratorAssignmentId },
    },
  );
}
