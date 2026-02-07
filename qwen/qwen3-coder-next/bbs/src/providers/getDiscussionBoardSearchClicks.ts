import { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchClick";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSearchClicks(): Promise<IPageIDiscussionBoardSearchClick> {
  const data = await MyGlobal.prisma.discussion_board_search_clicks.findMany({
    select: {
      id: true,
      search_query_id: true,
      search_result_id: true,
      user_id: true,
      clicked_at: true,
      result_position: true,
      session_id: true,
      ip_address: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_search_clicks.count();
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      search_query_id: record.search_query_id as string & tags.Format<"uuid">,
      search_result_id: record.search_result_id as string & tags.Format<"uuid">,
      user_id: record.user_id
        ? (record.user_id as string & tags.Format<"uuid">)
        : undefined,
      clicked_at: toISOStringSafe(record.clicked_at),
      result_position: record.result_position,
      session_id: record.session_id,
      ip_address: record.ip_address,
    })),
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: 1,
    },
  };
}
