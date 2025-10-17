import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteCommunityPlatformMemberUserPostsPostIdVote(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, postId } = props;

  // 1) Ensure target post exists and is active (not soft-deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      locked_at: true,
      archived_at: true,
      visibility_state: true,
    },
  });

  if (post === null) {
    throw new HttpException("Not Found", 404);
  }

  // 2) Business rule: deny vote changes on locked or archived posts
  const locked = post.locked_at !== null || post.visibility_state === "Locked";
  const archived =
    post.archived_at !== null || post.visibility_state === "Archived";
  if (locked || archived) {
    throw new HttpException(
      "Forbidden: Vote changes are not allowed on locked or archived posts",
      403,
    );
  }

  // 3) Idempotently clear the active vote (soft delete); no-op if none exists
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_post_votes.updateMany({
    where: {
      community_platform_user_id: memberUser.id,
      community_platform_post_id: postId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
