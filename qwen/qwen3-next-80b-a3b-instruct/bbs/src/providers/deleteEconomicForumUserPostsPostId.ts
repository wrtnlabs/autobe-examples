import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteEconomicForumUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicForumPost> {
  // Verify user has admin privileges
  const userType = typia.assert<"user" | "admin">(props.user.type);
  if (userType !== "admin") {
    throw new HttpException("Unauthorized - Admin privileges required", 403);
  }
  // Find and delete the post
  const deletedPost = await MyGlobal.prisma.economic_forum_posts.delete({
    where: { id: props.postId },
  });
  // Log audit in system_audits with proper date-time format
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4(),
      action: "DELETE_POST",
      actor_id: props.user.id,
      actor_session_id: props.user.session_id,
      target_id: props.postId,
      target_type: "POST",
      occurred_at: toISOStringSafe(new Date()),
      status: "SUCCESS",
    },
  });
  return deletedPost;
}
