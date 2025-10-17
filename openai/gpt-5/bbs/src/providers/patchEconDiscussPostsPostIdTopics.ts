import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import { IEEconDiscussPostTopicSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostTopicSort";
import { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function patchEconDiscussPostsPostIdTopics(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostTopic.IRequest;
}): Promise<IPageIEconDiscussTopic.ISummary> {
  const parent = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  if (!parent) throw new HttpException("Not Found", 404);

  const qSource = props.body.q ?? null;
  const q = qSource !== null ? qSource.trim() : null;

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_topics.findMany({
      where: {
        econ_discuss_post_id: props.postId,
        deleted_at: null,
        topic: {
          is: {
            deleted_at: null,
            ...(q !== null && q !== ""
              ? {
                  OR: [
                    { name: { contains: q } },
                    { description: { contains: q } },
                  ],
                }
              : {}),
          },
        },
      },
      include: {
        topic: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy:
        props.body.sort === "created_at_asc"
          ? { created_at: "asc" }
          : props.body.sort === "name_asc"
            ? { topic: { name: "asc" } }
            : props.body.sort === "name_desc"
              ? { topic: { name: "desc" } }
              : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_post_topics.count({
      where: {
        econ_discuss_post_id: props.postId,
        deleted_at: null,
        topic: {
          is: {
            deleted_at: null,
            ...(q !== null && q !== ""
              ? {
                  OR: [
                    { name: { contains: q } },
                    { description: { contains: q } },
                  ],
                }
              : {}),
          },
        },
      },
    }),
  ]);

  const data: IEconDiscussTopic.ISummary[] = rows.map((r) => ({
    id: r.topic.id as string & tags.Format<"uuid">,
    code: r.topic.code,
    name: r.topic.name,
  }));

  const current = Number(page);
  const size = Number(limit);
  const records = Number(total);
  const pages = size > 0 ? Math.ceil(records / size) : 0;

  return {
    pagination: {
      current,
      limit: size,
      records,
      pages,
    },
    data,
  };
}
