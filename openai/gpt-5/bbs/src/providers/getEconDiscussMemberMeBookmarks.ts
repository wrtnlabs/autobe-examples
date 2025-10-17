import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMeBookmarks(props: {
  member: MemberPayload;
}): Promise<IPageIEconDiscussPostBookmark.ISummary> {
  const { member } = props;

  // Default pagination
  const current = 0;
  const limit = 20;
  const skip = current * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_bookmarks.findMany({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        econ_discuss_user_id: true,
        econ_discuss_post_id: true,
        note: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_post_bookmarks.count({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussPostBookmark.ISummary[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    userId: r.econ_discuss_user_id as string & tags.Format<"uuid">,
    postId: r.econ_discuss_post_id as string & tags.Format<"uuid">,
    note: r.note ?? null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  const pagesNumber = total === 0 ? 0 : Math.ceil(total / Math.max(limit, 1));

  return {
    pagination: {
      current: Number(current) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(pagesNumber) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
