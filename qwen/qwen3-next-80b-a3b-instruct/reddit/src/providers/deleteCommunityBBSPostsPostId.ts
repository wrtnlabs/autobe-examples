import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityBBSPostsPostId(props: {
  postId: string;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
