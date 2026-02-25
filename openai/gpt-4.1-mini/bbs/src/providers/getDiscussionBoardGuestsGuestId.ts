import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardGuestTransformer } from "../transformers/DiscussionBoardGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuest> {
  const guestRecord =
    await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow({
      where: { id: props.guestId },
      ...DiscussionBoardGuestTransformer.select(),
    });
  return await DiscussionBoardGuestTransformer.transform(guestRecord);
}
