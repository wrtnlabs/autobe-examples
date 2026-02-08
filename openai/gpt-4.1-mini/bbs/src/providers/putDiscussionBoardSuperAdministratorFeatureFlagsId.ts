import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorFeatureFlagsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardFeatureFlag.IUpdate;
}): Promise<IDiscussionBoardFeatureFlag> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingFlag = await tx.discussion_board_feature_flags.findUnique({
      where: { id: props.id },
    });
    if (!existingFlag) {
      throw new HttpException("Feature flag not found", 404);
    }
    // No properties in body to update, so only update updated_at
    const updatedFlag = await tx.discussion_board_feature_flags.update({
      where: { id: props.id },
      data: {
        updated_at: now,
      },
    });
    // Audit log of update action can be added here if required
    return {
      id: updatedFlag.id as string & tags.Format<"uuid">,
      code: updatedFlag.code,
      name: updatedFlag.name,
      description:
        updatedFlag.description === null ? null : updatedFlag.description,
      enabled: updatedFlag.enabled,
      created_at: toISOStringSafe(updatedFlag.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(updatedFlag.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        updatedFlag.deleted_at === null || updatedFlag.deleted_at === undefined
          ? null
          : toISOStringSafe(updatedFlag.deleted_at),
    };
  });
}
