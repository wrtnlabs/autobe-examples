import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityNamePostsPostId(props: {
  admin: AdminPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityName, postId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      reddit_community_community_id: community.id,
    },
    select: { id: true },
  });

  if (!post) {
    throw new HttpException(
      `Post '${postId}' not found in community '${communityName}'`,
      404,
    );
  }

  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: postId },
  });
}
