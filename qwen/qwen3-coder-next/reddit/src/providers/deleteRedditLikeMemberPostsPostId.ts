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
  postId: string;
}): Promise<void> {
  const postIdUUID = props.postId as string & tags.Format<"uuid">;
  // Check if post exists and belongs to member
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: {
      id: postIdUUID,
    },
    select: {
      id: true,
      author_id: true,
      community_id: true,
    },
  });
  if (!post || post.author_id !== props.member.id) {
    throw new HttpException("Post not found or access denied", 404);
  }
  // Perform cascade delete using Prisma's relation cascade
  await MyGlobal.prisma.reddit_like_posts.delete({
    where: {
      id: postIdUUID,
    },
  });
}
