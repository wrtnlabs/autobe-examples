import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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

export async function patchDiscussionBoardAdministratorComments(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = 1;
  const limit = 100;
  if (page < 1) throw new HttpException("Page must be 1 or greater", 400);
  if (limit < 1) throw new HttpException("Limit must be 1 or greater", 400);
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: { deleted_at: null },
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      discussion_board_article_id: true,
      discussion_board_registered_user_id: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  return {
    data: records.map((record) => {
      const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
        record.created_at,
      );
      const updatedAt: (string & tags.Format<"date-time">) | null =
        record.updated_at ? toISOStringSafe(record.updated_at) : null;
      return {
        id: record.id,
        content: record.content,
        author_display_name: null,
        article_id: record.discussion_board_article_id,
        created_at: createdAt,
        updated_at: updatedAt,
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
