import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.IUpdate;
}): Promise<ICommunityComment> {
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    ...CommunityCommentTransformer.select(),
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to specified post", 404);
  }
  const isAuthor = comment.author_id === props.member.id;
  if (!isAuthor) {
    const post = await MyGlobal.prisma.community_posts.findUnique({
      where: { id: comment.post_id },
      select: { community_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    const moderator = await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.member.id, // Fixed: member_id → user_id
      },
    });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const updated = await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
    ...CommunityCommentTransformer.select(),
  });
  return await CommunityCommentTransformer.transform(updated);
}
