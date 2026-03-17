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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdPostsPostId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the post with ownership info
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        community_id: true,
        deleted_at: true,
      },
    },
  );
  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 2. Verify community match
  if (post.community_id !== props.communityId) {
    throw new HttpException("Post not found", 404);
  }
  // 3. Authorization check
  // Path A: Author check
  const isAuthor = post.author_id === props.member.id;
  // Path B: Moderator check (only if not author)
  const isModerator =
    isAuthor ||
    (await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: { id: true },
    })) !== null;
  // If neither author nor moderator, forbid
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Execute soft delete
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: new Date(),
    },
  });
}
