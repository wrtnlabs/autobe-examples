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
  // Step 6: Perform soft delete and create audit record in transaction
  const deletionTimestamp = new Date();
  const deletionTimestampString = toISOStringSafe(deletionTimestamp);
  await MyGlobal.prisma.$transaction([
    // Soft delete the post
    MyGlobal.prisma.reddit_community_posts.update({
      where: { id: props.postId },
      data: { deleted_at: deletionTimestampString },
    }),
    // Create audit record
    MyGlobal.prisma.reddit_community_post_deletions.create({
      data: {
        id: v4(),
        reddit_community_post_id: props.postId,
        deleter_member_id: props.member.id,
        deletion_reason: null,
        deleted_at: deletionTimestampString,
      },
    }),
  ]);
}
