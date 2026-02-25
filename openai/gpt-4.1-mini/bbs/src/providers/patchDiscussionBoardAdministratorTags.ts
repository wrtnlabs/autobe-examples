import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorTags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
  // Apply default values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const search = props.body.search ?? undefined;
  const sort = props.body.sort ?? "created_at_desc";
  // Determine Prisma orderBy input based on sort
  const orderBy =
    sort === "name_asc"
      ? { name: "asc" as const }
      : sort === "name_desc"
        ? { name: "desc" as const }
        : sort === "created_at_asc"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const };
  // Compose Prisma where filter with soft delete and optional search
  const where = {
    deleted_at: null,
    ...(search !== undefined && search !== ""
      ? { name: { contains: search } }
      : {}),
  } satisfies Prisma.discussion_board_tagsWhereInput;
  // Query total count for pagination
  const total = await MyGlobal.prisma.discussion_board_tags.count({ where });
  // Query paginated data
  const dataRaw = await MyGlobal.prisma.discussion_board_tags.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
  });
  // Transform data to response DTO format, converting dates with toISOStringSafe
  const data: IDiscussionBoardArticleTag.ISummary[] = dataRaw.map((record) => ({
    id: record.id,
    discussionBoardArticleId: "" as any, // This field does not exist in tag records; cannot fabricate
    discussionBoardTagId: record.id,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
