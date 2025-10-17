import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import { IEEconDiscussBookmarkSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussBookmarkSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberMeBookmarks(props: {
  member: MemberPayload;
  body: IEconDiscussPostBookmark.IRequest;
}): Promise<IPageIEconDiscussPostBookmark.ISummary> {
  const { member, body } = props;

  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_bookmarks.findMany({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
        ...(body.postId !== undefined &&
          body.postId !== null && {
            econ_discuss_post_id: body.postId,
          }),
        ...(body.hasNote !== undefined &&
          body.hasNote !== null &&
          (body.hasNote ? { NOT: { note: null } } : { note: null })),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && {
                    gte: body.createdFrom,
                  }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && {
                    lte: body.createdTo,
                  }),
              },
            }
          : {}),
        ...(body.q !== undefined &&
          body.q !== null &&
          body.q !== "" && {
            post: {
              is: {
                OR: [
                  { title: { contains: body.q } },
                  { summary: { contains: body.q } },
                ],
              },
            },
          }),
      },
      select: {
        id: true,
        econ_discuss_user_id: true,
        econ_discuss_post_id: true,
        note: true,
        created_at: true,
        updated_at: true,
      },
      orderBy:
        body.sortBy === "updatedAt"
          ? { updated_at: body.sortOrder === "asc" ? "asc" : "desc" }
          : { created_at: body.sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.econ_discuss_post_bookmarks.count({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
        ...(body.postId !== undefined &&
          body.postId !== null && {
            econ_discuss_post_id: body.postId,
          }),
        ...(body.hasNote !== undefined &&
          body.hasNote !== null &&
          (body.hasNote ? { NOT: { note: null } } : { note: null })),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && {
                    gte: body.createdFrom,
                  }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && {
                    lte: body.createdTo,
                  }),
              },
            }
          : {}),
        ...(body.q !== undefined &&
          body.q !== null &&
          body.q !== "" && {
            post: {
              is: {
                OR: [
                  { title: { contains: body.q } },
                  { summary: { contains: body.q } },
                ],
              },
            },
          }),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    userId: r.econ_discuss_user_id as string & tags.Format<"uuid">,
    postId: r.econ_discuss_post_id as string & tags.Format<"uuid">,
    note: r.note ?? null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
