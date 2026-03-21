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

export async function deleteRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the post
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      vote_score: true,
      deleted_at: true,
    },
  });
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  // 2. Ownership verification
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Get votes for karma adjustment
  const votes = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
    where: { reddit_clone_post_id: props.postId },
    select: { direction: true },
  });
  const karmaDelta = votes.reduce(
    (sum, vote) => sum + (vote.direction === "upvote" ? 1 : -1),
    0,
  );
  // 4. Cascade deletion in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        deleted_at: new Date(),
        vote_score: 0,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_comments.updateMany({
      where: { reddit_clone_post_id: props.postId },
      data: {
        deleted_at: new Date(),
        vote_score: 0,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_post_votes.deleteMany({
      where: { reddit_clone_post_id: props.postId },
    }),
  ]);
  // 5. Adjust karma if needed
  if (karmaDelta !== 0) {
    await MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      data: {
        karma_score: { decrement: karmaDelta },
        updated_at: new Date(),
      },
    });
  }
}
