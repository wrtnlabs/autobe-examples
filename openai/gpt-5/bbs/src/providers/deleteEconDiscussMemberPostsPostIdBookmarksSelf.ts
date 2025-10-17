import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdBookmarksSelf(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // Soft-delete the bookmark owned by the authenticated user if it exists and is active
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_post_bookmarks.updateMany({
    where: {
      econ_discuss_user_id: member.id,
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Idempotent: even if nothing was updated, consider it success
  return;
}
