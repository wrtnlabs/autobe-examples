import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanDurationTransformer } from "../transformers/DiscussionBoardBanDurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBanDurationsDurationId(props: {
  admin: AdminPayload;
  durationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanDuration> {
  const duration =
    await MyGlobal.prisma.discussion_board_ban_durations.findUnique({
      where: { id: props.durationId },
      ...DiscussionBoardBanDurationTransformer.select(),
    });
  if (!duration) {
    throw new HttpException("Ban duration configuration not found", 404);
  }
  return await DiscussionBoardBanDurationTransformer.transform(duration);
}
