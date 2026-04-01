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

export async function deleteRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the post
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      community_id: true,
      title: true,
      post_type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Step 2: Verify authorization
  const isOwner = post.author_id === props.member.id;
  if (!isOwner) {
    // Check if member is moderator of the community
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          reddit_community_community_id: post.community_id,
          reddit_community_moderator_id: props.member.id,
          deleted_at: null,
        },
      });
    if (moderator === null) {
      throw new HttpException(
        "You do not have permission to delete this post",
        403,
      );
    }
  }
  // Step 3: Validate deletion eligibility
  if (post.deleted_at !== null) {
    throw new HttpException("Post has already been deleted", 409);
  }
  // Step 4 & 5: Perform soft delete and create audit record
  const deletionTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_community_posts.update({
      where: { id: props.postId },
      data: {
        deleted_at: deletionTimestamp,
      },
    }),
    MyGlobal.prisma.reddit_community_post_deletions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_post_id: props.postId,
        deleter_member_id: props.member.id,
        deletion_reason: null,
        deleted_at: deletionTimestamp,
      },
    }),
  ]);
}
