import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // Fetch the post to verify ownership
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
    select: {
      reddit_like_member_id: true,
    },
  });

  // Verify authorization: only the post author can delete their own post
  if (post.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own posts",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
