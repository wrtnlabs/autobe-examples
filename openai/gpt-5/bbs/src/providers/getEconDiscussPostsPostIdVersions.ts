import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";

export async function getEconDiscussPostsPostIdVersions(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussPostSnapshot> {
  const { postId } = props;

  // Verify parent post exists and is not soft-deleted
  const parent = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!parent) {
    throw new HttpException("Post not found", 404);
  }

  // Default pagination parameters (simple GET without query params)
  const current = 0; // zero-based page index
  const limit = 50; // default page size
  const skip = current * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_snapshots.findMany({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        econ_discuss_post_id: true,
        econ_discuss_user_id: true,
        version: true,
        title: true,
        body: true,
        summary: true,
        published_at: true,
        created_at: true,
        updated_at: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_post_snapshots.count({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussPostSnapshot[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    econ_discuss_post_id: r.econ_discuss_post_id as string &
      tags.Format<"uuid">,
    econ_discuss_user_id: r.econ_discuss_user_id as string &
      tags.Format<"uuid">,
    version: Number(r.version) as number & tags.Type<"int32">,
    title: r.title,
    body: r.body,
    summary: r.summary ?? null,
    published_at: r.published_at ? toISOStringSafe(r.published_at) : null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  const records = Number(total);
  const pages = Math.max(1, Math.ceil(records / limit));

  return {
    pagination: {
      current: Number(current) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(records) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(pages) as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
