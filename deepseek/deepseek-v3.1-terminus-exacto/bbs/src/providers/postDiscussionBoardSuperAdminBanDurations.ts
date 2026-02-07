import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanDurationCollector } from "../collectors/DiscussionBoardBanDurationCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanDurationTransformer } from "../transformers/DiscussionBoardBanDurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBanDurations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanDuration.ICreate;
}): Promise<IDiscussionBoardBanDuration> {
  // Check if ban duration with same name already exists
  const existingBanDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingBanDuration) {
    throw new HttpException("Ban duration with this name already exists", 400);
  }
  const created = await MyGlobal.prisma.discussion_board_ban_durations.create({
    data: await DiscussionBoardBanDurationCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardBanDurationTransformer.select(),
  });
  return await DiscussionBoardBanDurationTransformer.transform(created);
}
