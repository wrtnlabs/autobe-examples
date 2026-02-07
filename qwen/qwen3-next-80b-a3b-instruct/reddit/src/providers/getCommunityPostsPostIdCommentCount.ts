import { ICommunityPostCommentsCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostCommentsCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdCommentCount(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPostCommentsCount> {
  const count = await MyGlobal.prisma.community_post_comments_counts.findUnique(
    {
      where: { community_post_id: props.postId, deleted_at: null },
    },
  );
  if (!count)
    throw new HttpException("Post not found or has no comment count", 404);
  return {};
}
