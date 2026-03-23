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
  // Step 1: Find the post (throws 404 if not found)
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_members_id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  // Step 2: Check if already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post is already deleted", 400);
  }
  // Step 3: Check authorization
  const isAuthor = post.reddit_clone_members_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    // Check if member is a moderator of the post's community
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_communities_id: post.reddit_clone_community_id,
          reddit_clone_members_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    isModerator = moderator !== null;
  }
  // Step 4: Verify authorization
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Soft delete the post
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Comments are cascade deleted by database constraint (onDelete: Cascade)
  // No need to manually delete them
}
