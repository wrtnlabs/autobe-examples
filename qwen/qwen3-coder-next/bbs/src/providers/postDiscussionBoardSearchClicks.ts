import { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
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

export async function postDiscussionBoardSearchClicks(props: {
  body: IDiscussionBoardSearchClick.ICreate;
}): Promise<IDiscussionBoardSearchClick> {
  // Generate UUIDs for the click record
  const id: string & tags.Format<"uuid"> = v4();
  // Create the search click record in the database with all required fields
  const created = await MyGlobal.prisma.discussion_board_search_clicks.create({
    data: {
      id,
      clicked_at: new Date(),
      result_position: 0,
      session_id: null,
      ip_address: null,
      query: {
        connect: {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      },
      result: {
        connect: {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      },
    },
    select: {
      id: true,
      clicked_at: true,
      result_position: true,
      session_id: true,
      ip_address: true,
      query: true,
      result: true,
    },
  });
  // Convert Date to ISO string for datetime fields
  return {
    id: created.id,
    clicked_at: toISOStringSafe(created.clicked_at) as string &
      tags.Format<"date-time">,
    result_position: created.result_position,
    session_id: created.session_id
      ? (created.session_id as string & tags.Format<"uuid">)
      : undefined,
    ip_address: created.ip_address,
  };
}
