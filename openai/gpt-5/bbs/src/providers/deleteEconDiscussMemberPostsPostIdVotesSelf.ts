import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdVotesSelf(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // Ensure the target post exists and is not soft-deleted
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  // Transition the caller's vote to withdrawn (idempotent if already withdrawn or absent)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_post_votes.updateMany({
    where: {
      econ_discuss_user_id: member.id,
      econ_discuss_post_id: postId,
      deleted_at: null,
      status: "active",
    },
    data: {
      status: "withdrawn",
      updated_at: now,
    },
  });
}
