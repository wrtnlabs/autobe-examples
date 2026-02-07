import { IDiscussionBoardSearchBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchBehavior";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSearchBehavior(props: {
  body: IDiscussionBoardSearchBehavior.ICreate;
}): Promise<IDiscussionBoardSearchBehavior> {
  // Create search behavior record with default values
  const created = await MyGlobal.prisma.discussion_board_search_clicks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      search_query_id: v4() as string & tags.Format<"uuid">,
      search_result_id: v4() as string & tags.Format<"uuid">,
      user_id: null,
      clicked_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      result_position: 1,
      session_id: null,
      ip_address: null,
    },
  });
  // Return the created search behavior record
  return {
    id: created.id,
    search_query_id: created.search_query_id,
    search_result_id: created.search_result_id,
    user_id: created.user_id,
    clicked_at: created.clicked_at,
    result_position: created.result_position,
    session_id: created.session_id,
    ip_address: created.ip_address,
  } as IDiscussionBoardSearchBehavior;
}
