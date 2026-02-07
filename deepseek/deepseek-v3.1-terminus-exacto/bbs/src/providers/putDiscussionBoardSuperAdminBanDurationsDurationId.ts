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

export async function putDiscussionBoardSuperAdminBanDurationsDurationId(props: {
  superAdmin: SuperadminPayload;
  durationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanDuration.IUpdate;
}): Promise<IDiscussionBoardBanDuration> {
  // Check if ban duration exists
  const existingDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.findUnique({
      where: { id: props.durationId, deleted_at: null },
    });
  if (!existingDuration) {
    throw new HttpException("Ban duration not found", 404);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name && props.body.name !== existingDuration.name) {
    const existingName =
      await MyGlobal.prisma.discussion_board_ban_durations.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.durationId },
        },
      });
    if (existingName) {
      throw new HttpException("Ban duration name already exists", 400);
    }
  }
  // Prepare update data with proper timestamp handling
  const updateData: Prisma.discussion_board_ban_durationsUpdateInput = {};
  // Only include fields that are actually being updated
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.duration_hours !== undefined)
    updateData.duration_hours = props.body.duration_hours;
  if (props.body.is_permanent !== undefined)
    updateData.is_permanent = props.body.is_permanent;
  // Always update the timestamp
  updateData.updated_at = toISOStringSafe(new Date());
  // Perform the update
  const updatedDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.update({
      where: { id: props.durationId },
      data: updateData,
      ...DiscussionBoardBanDurationTransformer.select(),
    });
  return await DiscussionBoardBanDurationTransformer.transform(updatedDuration);
}
