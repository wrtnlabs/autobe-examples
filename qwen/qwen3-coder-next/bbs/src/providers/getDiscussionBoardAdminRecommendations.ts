import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminRecommendations(props: {
  admin: AdminPayload;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      author_id: true,
      section_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    title: record.title,
    content: record.content,
    view_count: (record.view_count ?? 0) satisfies number &
      tags.Type<"int32"> as number & tags.Type<"int32"> & tags.Minimum<0>,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    member: {
      id: null as unknown as string & tags.Format<"uuid">,
      name: "" as string,
    },
    section: {
      id: null as unknown as string & tags.Format<"uuid">,
      name: "" as string,
    },
  }));
  return {
    data: transformedData,
    pagination: {
      current: (page ?? 0) satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: (limit ?? 0) satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: (total ?? 0) satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: ((total ?? 0) > 0
        ? Math.ceil(total / limit)
        : 0) satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
