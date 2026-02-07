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

export async function putDiscussionBoardSuperAdminModerationActionTypesActionTypeId(props: {
  superAdmin: SuperadminPayload;
  actionTypeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationActionType.IUpdate;
}): Promise<IDiscussionBoardModerationActionType> {
  // Check if the moderation action type exists
  const existingActionType =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findUnique({
      where: { id: props.actionTypeId },
    });
  if (!existingActionType) {
    throw new HttpException("Moderation action type not found", 404);
  }
  // Check code uniqueness if code is being updated and not empty
  if (
    props.body.code !== undefined &&
    props.body.code !== existingActionType.code
  ) {
    if (props.body.code.trim() === "") {
      throw new HttpException("Action type code cannot be empty", 400);
    }
    const existingCode =
      await MyGlobal.prisma.discussion_board_moderation_action_types.findFirst({
        where: {
          code: props.body.code,
          id: { not: props.actionTypeId },
        },
      });
    if (existingCode) {
      throw new HttpException("Action type code already exists", 400);
    }
  }
  // Prepare update data with proper null handling
  const updateData: Prisma.discussion_board_moderation_action_typesUpdateInput =
    {};
  if (props.body.code !== undefined) updateData.code = props.body.code;
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  // Handle optional nullable fields
  if (props.body.category !== undefined) {
    updateData.category =
      props.body.category === null ? null : props.body.category;
  }
  if (props.body.severity_level !== undefined) {
    updateData.severity_level =
      props.body.severity_level === null ? null : props.body.severity_level;
  }
  if (props.body.requires_reason !== undefined)
    updateData.requires_reason = props.body.requires_reason;
  if (props.body.is_active !== undefined)
    updateData.is_active = props.body.is_active;
  // Always update the timestamp
  updateData.updated_at = toISOStringSafe(new Date());
  // Perform the update
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_action_types.update({
      where: { id: props.actionTypeId },
      data: updateData,
      ...DiscussionBoardModerationActionTypeTransformer.select(),
    });
  return await DiscussionBoardModerationActionTypeTransformer.transform(
    updated,
  );
}
