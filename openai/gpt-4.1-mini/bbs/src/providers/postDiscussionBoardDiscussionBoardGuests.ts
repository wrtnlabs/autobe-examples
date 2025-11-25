import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function postDiscussionBoardDiscussionBoardGuests(props: {
  body: IDiscussionBoardGuest.ICreate;
}): Promise<IDiscussionBoardGuest> {
  const now = toISOStringSafe(new Date());
  const id = v4();
  const created = await MyGlobal.prisma.discussion_board_guest.create({
    data: {
      id,
      nickname: props.body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    nickname: created.nickname,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
