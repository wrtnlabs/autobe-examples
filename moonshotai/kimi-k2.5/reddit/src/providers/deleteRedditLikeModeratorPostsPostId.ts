import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the post to verify existence and get community_id
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, community_id: true },
  });
  // Verify moderator has authority in this community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: post.community_id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException(
      "Forbidden - not a moderator of this community",
      403,
    );
  }
  // Delete the post - cascade handles votes, snapshots, content records
  await MyGlobal.prisma.reddit_like_posts.delete({
    where: { id: props.postId },
  });
}
