import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardModerationActionTypeTransformer } from "../transformers/DiscussionBoardModerationActionTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminModerationActionTypesActionTypeId(props: {
  admin: AdminPayload;
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
