import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, commentId } = props;

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      reddit_community_post_id: postId,
      author_member_id: member.id,
    },
  });

  if (comment === null) {
    throw new HttpException("Comment not found or access denied", 404);
  }

  await MyGlobal.prisma.reddit_community_comments.delete({
    where: { id: commentId },
  });
}
