import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchAdminPostsPostIdReject(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardPosts.IReject;
}): Promise<IEconomicBoardPosts> {
  // Validate the post exists and is in 'pending' status
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });

  // Ensure the post is still pending - if already rejected or deleted, fail with 409
  if (post.status !== "pending") {
    throw new HttpException("Post is not pending; cannot reject", 409);
  }

  // Update the post with rejection details
  const updated = await MyGlobal.prisma.economic_board_posts.update({
    where: { id: props.postId },
    data: {
      status: "rejected",
      admin_id: props.admin.id,
      moderation_reason: props.body.moderation_reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated post with Date properties converted to string & Format<"date-time">
  return {
    ...updated,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    edited_at: updated.edited_at ? toISOStringSafe(updated.edited_at) : null,
    status: "rejected" satisfies
      | "pending"
      | "published"
      | "rejected"
      | "deleted",
  };
}
