import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardModerationActionTypeTransformer } from "../transformers/DiscussionBoardModerationActionTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminModerationActionTypesActionTypeId(props: {
  superAdmin: SuperadminPayload;
  actionTypeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationActionType> {
  const actionType =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findUnique({
      where: { id: props.actionTypeId },
      ...DiscussionBoardModerationActionTypeTransformer.select(),
    });
  if (!actionType) {
    throw new HttpException("Moderation action type not found", 404);
  }
  return await DiscussionBoardModerationActionTypeTransformer.transform(
    actionType,
  );
}
