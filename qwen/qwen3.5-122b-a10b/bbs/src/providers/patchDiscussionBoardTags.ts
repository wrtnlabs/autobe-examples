import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with soft-delete filter
  const whereInput: Prisma.discussion_board_tagsWhereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: {
        contains: props.body.name,
        mode: "insensitive",
      },
    }),
    ...(props.body.description && {
      description: {
        contains: props.body.description,
        mode: "insensitive",
      },
    }),
  };
  // Build order by with default created_at DESC
  const orderByInput: Prisma.discussion_board_tagsOrderByWithRelationInput =
    props.body.sort === "name"
      ? { name: props.body.order ?? "asc" }
      : props.body.sort === "description"
        ? { description: props.body.order ?? "asc" }
        : { created_at: "desc" as const };
  // Fetch paginated data
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  // Transform to response format
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          name: record.name,
          description: record.description ?? null,
          created_at: record.created_at.toISOString(),
          updated_at: record.updated_at.toISOString(),
          deleted_at: record.deleted_at
            ? record.deleted_at.toISOString()
            : null,
        }) satisfies IDiscussionBoardTag.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardTag.ISummary;
}
