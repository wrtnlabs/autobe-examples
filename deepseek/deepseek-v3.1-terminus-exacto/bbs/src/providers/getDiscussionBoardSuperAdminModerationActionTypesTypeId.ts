import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardModerationActionTypeTransformer } from "../transformers/DiscussionBoardModerationActionTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminModerationActionTypesTypeId(props: {
  superAdmin: SuperAdminPayload;
  typeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationActionType> {
  const actionType =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findUniqueOrThrow(
      {
        where: { id: props.typeId },
        ...DiscussionBoardModerationActionTypeTransformer.select(),
      },
    );
  return await DiscussionBoardModerationActionTypeTransformer.transform(
    actionType,
  );
}
