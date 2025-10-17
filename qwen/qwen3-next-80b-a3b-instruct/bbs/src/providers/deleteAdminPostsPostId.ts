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

export async function deleteAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardPosts.IDelete> {
  // Verify the post exists and is not already deleted (hard delete so we expect it to exist)
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });

  // Hard delete the post (this will cascade delete all replies due to CASCADE onDelete in schema)
  await MyGlobal.prisma.economic_board_posts.delete({
    where: { id: props.postId },
  });

  // Return the expected response type with empty reason (reason is optional and can be omitted)
  return {};
}
