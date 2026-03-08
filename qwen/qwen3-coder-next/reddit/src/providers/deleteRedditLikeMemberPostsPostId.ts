import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      community_id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 409);
  }
  const isAuthor = post.author_id === props.member.id;
  const isModerator =
    (await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.member.id,
        community_id: post.community_id,
      },
    })) !== null;
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_posts.delete({
    where: { id: props.postId },
  });
}
