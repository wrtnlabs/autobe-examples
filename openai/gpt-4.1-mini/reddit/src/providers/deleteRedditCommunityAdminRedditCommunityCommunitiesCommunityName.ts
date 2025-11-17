import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityCommunitiesCommunityName(props: {
  admin: AdminPayload;
  communityName: string;
}): Promise<void> {
  // Verify existence of the community by unique communityName
  const existing =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!existing) {
    throw new HttpException(`Community not found: ${props.communityName}`, 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.reddit_community_communities.delete({
    where: { name: props.communityName },
  });
}
