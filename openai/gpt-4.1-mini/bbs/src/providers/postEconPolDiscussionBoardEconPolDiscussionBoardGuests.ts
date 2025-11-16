import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

export async function postEconPolDiscussionBoardEconPolDiscussionBoardGuests(props: {
  body: IEconPolDiscussionBoardGuest.ICreate;
}): Promise<IEconPolDiscussionBoardGuest> {
  const now: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.econ_pol_discussion_board_guests.create(
    {
      data: {
        id: v4(),
        username: props.body.username,
        created_at: now,
        updated_at: now,
      },
    },
  );
  return {
    id: created.id,
    username: created.username,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies IEconPolDiscussionBoardGuest;
}
