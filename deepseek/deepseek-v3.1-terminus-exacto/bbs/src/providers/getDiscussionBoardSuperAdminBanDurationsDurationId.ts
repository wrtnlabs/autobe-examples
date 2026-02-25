import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanDurationTransformer } from "../transformers/DiscussionBoardBanDurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminBanDurationsDurationId(props: {
  superAdmin: SuperAdminPayload;
  durationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanDuration> {
  const banDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.findUniqueOrThrow({
      where: {
        id: props.durationId,
        deleted_at: null, // Only retrieve active ban durations
      },
      ...DiscussionBoardBanDurationTransformer.select(),
    });
  return await DiscussionBoardBanDurationTransformer.transform(banDuration);
}
