import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminBanDurationsDurationId(props: {
  superAdmin: SuperAdminPayload;
  durationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the ban duration exists and is not already deleted
  const existingDuration =
    await MyGlobal.prisma.discussion_board_ban_durations.findFirst({
      where: {
        id: props.durationId,
        deleted_at: null,
      },
    });
  if (!existingDuration) {
    throw new HttpException("Ban duration configuration not found", 404);
  }
  // Perform soft deletion by setting deleted_at to current timestamp
  const deletionResult =
    await MyGlobal.prisma.discussion_board_ban_durations.updateMany({
      where: {
        id: props.durationId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  // Verify that the deletion actually affected a record
  if (deletionResult.count === 0) {
    throw new HttpException(
      "Ban duration configuration could not be deleted",
      500,
    );
  }
}
