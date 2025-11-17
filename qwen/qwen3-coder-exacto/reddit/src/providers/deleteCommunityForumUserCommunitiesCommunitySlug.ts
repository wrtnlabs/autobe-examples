import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserCommunitiesCommunitySlug(props: {
  user: UserPayload;
  communitySlug: string;
}): Promise<void> {
  // Find the community by slug, ensuring it's not soft deleted
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        slug: props.communitySlug,
        deleted_at: null,
      },
    });

  // Check if community exists
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Verify that the authenticated user is the creator of the community
  if (community.created_by_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to delete this community",
      403,
    );
  }

  // Perform hard delete of the community
  await MyGlobal.prisma.community_forum_communities.delete({
    where: {
      id: community.id,
    },
  });
}
