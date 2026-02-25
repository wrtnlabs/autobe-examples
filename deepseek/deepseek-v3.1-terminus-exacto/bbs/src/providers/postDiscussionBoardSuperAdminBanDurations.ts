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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanDurationTransformer } from "../transformers/DiscussionBoardBanDurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBanDurations(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBanDuration.ICreate;
}): Promise<IDiscussionBoardBanDuration> {
  // Validate name uniqueness (case-insensitive check)
  const existing =
    await MyGlobal.prisma.discussion_board_ban_durations.findFirst({
      where: {
        name: { equals: props.body.name, mode: "insensitive" },
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      `Ban duration with name '${props.body.name}' already exists`,
      400,
    );
  }
  // Additional validation: prevent empty names
  if (!props.body.name.trim()) {
    throw new HttpException("Ban duration name cannot be empty", 400);
  }
  // Create new ban duration using collector
  const created = await MyGlobal.prisma.discussion_board_ban_durations.create({
    data: await DiscussionBoardBanDurationCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardBanDurationTransformer.select(),
  });
  // Transform and return the result
  return await DiscussionBoardBanDurationTransformer.transform(created);
}
