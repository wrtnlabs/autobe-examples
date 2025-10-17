import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function getEconDiscussPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPost> {
  const now = toISOStringSafe(new Date());

  const row = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
      OR: [
        { published_at: { not: null } },
        { scheduled_publish_at: { lte: now } },
      ],
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
      title: true,
      body: true,
      summary: true,
      published_at: true,
      scheduled_publish_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!row) throw new HttpException("Not Found", 404);

  return typia.assert<IEconDiscussPost>({
    id: row.id,
    author_user_id: row.econ_discuss_user_id,
    title: row.title,
    body: row.body,
    summary: row.summary ?? null,
    published_at: row.published_at ? toISOStringSafe(row.published_at) : null,
    scheduled_publish_at: row.scheduled_publish_at
      ? toISOStringSafe(row.scheduled_publish_at)
      : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  });
}
