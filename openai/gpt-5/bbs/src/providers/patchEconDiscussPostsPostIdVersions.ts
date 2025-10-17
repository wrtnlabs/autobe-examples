import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";
import { IPageIEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconDiscussPostsPostIdVersions(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostSnapshot.IRequest;
}): Promise<IPageIEconDiscussPostSnapshot> {
  const { postId, body } = props;

  const parent = await MyGlobal.prisma.econ_discuss_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!parent) throw new HttpException("Not Found", 404);
  if (parent.deleted_at !== null) throw new HttpException("Not Found", 404);

  const pageValue = body.page ?? 1;
  const sizeValue = body.pageSize ?? 20;
  const page = Number(pageValue);
  const limit = Number(sizeValue);
  const skip = (page - 1) * limit;

  const whereCondition = {
    econ_discuss_post_id: postId,
    deleted_at: null,
    ...((body.version_min !== undefined && body.version_min !== null) ||
    (body.version_max !== undefined && body.version_max !== null)
      ? {
          version: {
            ...(body.version_min !== undefined &&
              body.version_min !== null && {
                gte: Number(body.version_min),
              }),
            ...(body.version_max !== undefined &&
              body.version_max !== null && {
                lte: Number(body.version_max),
              }),
          },
        }
      : {}),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
    ...(body.q !== undefined && body.q !== null && body.q !== ""
      ? {
          OR: [{ title: { contains: body.q } }, { body: { contains: body.q } }],
        }
      : {}),
  };

  const sortBy = body.sort_by ?? "version";
  const order = body.order ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_snapshots.findMany({
      where: whereCondition,
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
      orderBy:
        sortBy === "version"
          ? { version: order }
          : sortBy === "created_at"
            ? { created_at: order }
            : sortBy === "updated_at"
              ? { updated_at: order }
              : { published_at: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_post_snapshots.count({
      where: whereCondition,
    }),
  ]);

  const data: IEconDiscussPostSnapshot[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    econ_discuss_post_id: r.econ_discuss_post_id as string &
      tags.Format<"uuid">,
    econ_discuss_user_id: r.econ_discuss_user_id as string &
      tags.Format<"uuid">,
    version: r.version as number & tags.Type<"int32">,
    title: r.title,
    body: r.body,
    summary: r.summary ?? null,
    published_at: r.published_at ? toISOStringSafe(r.published_at) : null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(pages),
  };

  return {
    pagination,
    data,
  };
}
