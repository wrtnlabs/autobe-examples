import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanDurationTransformer } from "../transformers/DiscussionBoardBanDurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminBanDurationsDurationId(props: {
  superAdmin: SuperadminPayload;
  durationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanDuration> {
  const banDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.findUnique({
      where: { id: props.durationId },
      ...DiscussionBoardBanDurationTransformer.select(),
    });
  if (!banDuration) {
    throw new HttpException("Ban duration not found", 404);
  }
  return await DiscussionBoardBanDurationTransformer.transform(banDuration);
}
