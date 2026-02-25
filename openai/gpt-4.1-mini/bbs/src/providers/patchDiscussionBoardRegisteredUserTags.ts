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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserTags(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const search: string | undefined = props.body.search;
  const sort: string = props.body.sort ?? "created_at_desc";
  const where: Prisma.discussion_board_article_tagsWhereInput = {
    deleted_at: null,
    ...(search
      ? { tag: { name: { contains: search, mode: "insensitive" } } }
      : {}),
  };
  const orderBy: Prisma.discussion_board_article_tagsOrderByWithRelationInput =
    sort === "name_asc"
      ? { tag: { name: "asc" } }
      : sort === "name_desc"
        ? { tag: { name: "desc" } }
        : sort === "created_at_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const skip = (page - 1) * limit;
  const total = await MyGlobal.prisma.discussion_board_article_tags.count({
    where,
  });
  const rawData = await MyGlobal.prisma.discussion_board_article_tags.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      discussion_board_article_id: true,
      discussion_board_tag_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const data: IDiscussionBoardArticleTag.ISummary[] = rawData.map((record) => ({
    id: record.id,
    discussionBoardArticleId: record.discussion_board_article_id,
    discussionBoardTagId: record.discussion_board_tag_id,
    createdAt: (toISOStringSafe(record.created_at) ?? "") as string &
      tags.Format<"date-time">,
    updatedAt: (toISOStringSafe(record.updated_at) ?? "") as string &
      tags.Format<"date-time">,
    deletedAt:
      record.deleted_at === null
        ? null
        : (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
