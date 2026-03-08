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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Query the comment to verify existence and ownership
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      deleted_at: true,
    },
  });
  // 2. Validate comment exists
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Validate comment is not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // 4. Validate comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // 5. Validate requesting member is the comment author
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Query all votes on this comment to calculate karma reversal
  const votes = await MyGlobal.prisma.community_platform_votes.findMany({
    where: { comment_id: props.commentId },
    select: {
      vote_type: true,
    },
  });
  // 7. Calculate karma reversal amount
  // Upvote removal: author loses 1 karma per upvote (reverse of +1 gain)
  // Downvote removal: author gains 1 karma per downvote (reverse of -1 loss)
  let karmaChange = 0;
  for (const vote of votes) {
    if (vote.vote_type === "upvote") {
      karmaChange -= 1;
    } else {
      karmaChange += 1;
    }
  }
  // 8. Build transaction operations with explicit type to allow heterogeneous Prisma operations
  const operations: Prisma.PrismaPromise<any>[] = [
    // Soft delete the comment
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    }),
    // Decrement post comment count
    MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        comment_count: { decrement: 1 },
      },
    }),
  ];
  // Add karma update if there were votes
  if (karmaChange !== 0) {
    operations.push(
      MyGlobal.prisma.community_platform_members.update({
        where: { id: comment.author_id },
        data: {
          karma: { increment: karmaChange },
        },
      }),
    );
  }
  // 9. Execute transaction
  await MyGlobal.prisma.$transaction(operations);
}
