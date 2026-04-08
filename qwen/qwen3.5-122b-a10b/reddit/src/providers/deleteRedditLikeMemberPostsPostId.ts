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
  // 1. Fetch post by postId
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_like_community_id: true,
      reddit_like_member_id: true,
      deleted_at: true,
    },
  });
  // 2. Check if already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has already been deleted", 410);
  }
  // 3. Authorization check
  const isOwner = post.reddit_like_member_id === props.member.id;
  if (!isOwner) {
    // Check if member is moderator of the community
    const isModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: post.reddit_like_community_id,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isModerator) {
      // Check if member is owner of the community
      const community =
        await MyGlobal.prisma.reddit_like_communities.findUnique({
          where: { id: post.reddit_like_community_id },
          select: { owner_id: true },
        });
      if (!community || community.owner_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  // 4. Soft delete
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: new Date(),
    },
  });
}
