import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deletePoliticalForumModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string;
}): Promise<void> {
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.political_forum_posts.delete({
      where: { id: props.postId },
    }),
    MyGlobal.prisma.political_forum_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        political_forum_moderator_id: props.moderator.id,
        political_forum_post_id: props.postId,
        action_type: "delete",
        reason: "Post deleted by moderator",
        created_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
