import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategories";
import { IPageIDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardCategories";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardDiscussionBoardCategories(props: {
  body: IDiscussionBoardDiscussionBoardCategories.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardCategories.ISummary> {
  const { body } = props;

  // Pagination defaults and normalization
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit = typeof limitRaw === "number" && limitRaw > 0 ? limitRaw : 10;

  // Build where clause
  const where: {
    name?: string;
    description?: { contains: string } | null;
    deleted_at: null;
  } = {
    deleted_at: null,
  };

  if (body.name !== undefined) {
    where.name = body.name;
  }

  if (body.description !== undefined && body.description !== null) {
    if (body.description === "") {
      where.description = { contains: "" };
    } else {
      where.description = { contains: body.description };
    }
  }

  const allowedSortFields = ["name", "created_at", "updated_at"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const order =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const skip = (page - 1) * limit;

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_categories.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_categories.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at != null ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
