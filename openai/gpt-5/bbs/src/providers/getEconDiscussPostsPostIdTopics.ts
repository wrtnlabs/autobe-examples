import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function getEconDiscussPostsPostIdTopics(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussTopic.ISummary> {
  const { postId } = props;

  // Verify post exists and is active (not soft-deleted)
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!post) throw new HttpException("Not Found", 404);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_topics.findMany({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
        topic: { deleted_at: null },
      },
      select: {
        topic: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.econ_discuss_post_topics.count({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
        topic: { deleted_at: null },
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.topic.id as string & tags.Format<"uuid">,
    code: row.topic.code,
    name: row.topic.name,
  }));

  return {
    pagination: {
      current: Number(1),
      limit: Number(total),
      records: Number(total),
      pages: Number(1),
    },
    data,
  };
}
