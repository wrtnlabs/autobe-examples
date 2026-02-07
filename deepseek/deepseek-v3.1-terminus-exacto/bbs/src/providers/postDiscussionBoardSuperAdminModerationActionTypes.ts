import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardModerationActionTypeCollector } from "../collectors/DiscussionBoardModerationActionTypeCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardModerationActionTypeTransformer } from "../transformers/DiscussionBoardModerationActionTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminModerationActionTypes(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardModerationActionType.ICreate;
}): Promise<IDiscussionBoardModerationActionType> {
  // Check if code already exists
  const existing =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findFirst({
      where: { code: props.body.code },
    });
  if (existing) {
    throw new HttpException(
      "Moderation action type with this code already exists",
      400,
    );
  }
  const created =
    await MyGlobal.prisma.discussion_board_moderation_action_types.create({
      data: await DiscussionBoardModerationActionTypeCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardModerationActionTypeTransformer.select(),
    });
  return await DiscussionBoardModerationActionTypeTransformer.transform(
    created,
  );
}
