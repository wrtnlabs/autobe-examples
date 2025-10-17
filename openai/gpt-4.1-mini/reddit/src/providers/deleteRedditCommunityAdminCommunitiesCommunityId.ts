import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: communityId },
    });

  if (community === null) {
    throw new HttpException("Community not found", 404);
  }

  await MyGlobal.prisma.reddit_community_communities.delete({
    where: { id: communityId },
  });
}
