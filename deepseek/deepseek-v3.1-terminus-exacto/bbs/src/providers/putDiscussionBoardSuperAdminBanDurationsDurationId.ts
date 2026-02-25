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

export async function putDiscussionBoardSuperAdminBanDurationsDurationId(props: {
  superAdmin: SuperAdminPayload;
  durationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanDuration.IUpdate;
}): Promise<IDiscussionBoardBanDuration> {
  // Verify ban duration exists
  await MyGlobal.prisma.discussion_board_ban_durations.findUniqueOrThrow({
    where: { id: props.durationId },
  });
  // Update record with provided fields and timestamp
  await MyGlobal.prisma.discussion_board_ban_durations.update({
    where: { id: props.durationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.duration_hours !== undefined && {
        duration_hours: props.body.duration_hours,
      }),
      ...(props.body.is_permanent !== undefined && {
        is_permanent: props.body.is_permanent,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch and return updated record
  const updated =
    await MyGlobal.prisma.discussion_board_ban_durations.findUniqueOrThrow({
      where: { id: props.durationId },
      ...DiscussionBoardBanDurationTransformer.select(),
    });
  return await DiscussionBoardBanDurationTransformer.transform(updated);
}
