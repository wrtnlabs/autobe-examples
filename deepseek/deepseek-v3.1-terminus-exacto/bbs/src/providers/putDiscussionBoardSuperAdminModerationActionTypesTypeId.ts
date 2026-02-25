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

export async function putDiscussionBoardSuperAdminModerationActionTypesTypeId(props: {
  superAdmin: SuperAdminPayload;
  typeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationActionType.IUpdate;
}): Promise<IDiscussionBoardModerationActionType> {
  // Verify the moderation action type exists
  await MyGlobal.prisma.discussion_board_moderation_action_types.findUniqueOrThrow(
    {
      where: { id: props.typeId },
    },
  );
  // Check code uniqueness if code is being updated
  if (props.body.code !== undefined) {
    const existingWithSameCode =
      await MyGlobal.prisma.discussion_board_moderation_action_types.findUnique(
        {
          where: { code: props.body.code },
        },
      );
    if (existingWithSameCode && existingWithSameCode.id !== props.typeId) {
      throw new HttpException(
        "Moderation action type with this code already exists",
        409,
      );
    }
  }
  // Build update data with proper field handling
  const updateData: Prisma.discussion_board_moderation_action_typesUpdateInput =
    {
      ...(props.body.code !== undefined && { code: props.body.code }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category !== undefined
        ? { category: props.body.category }
        : {}),
      ...(props.body.severity_level !== undefined
        ? { severity_level: props.body.severity_level }
        : {}),
      ...(props.body.requires_reason !== undefined && {
        requires_reason: props.body.requires_reason,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      updated_at: new Date().toISOString(), // Convert Date to ISO string
    };
  // Update the record and return transformed result
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_action_types.update({
      where: { id: props.typeId },
      data: updateData,
      ...DiscussionBoardModerationActionTypeTransformer.select(),
    });
  return await DiscussionBoardModerationActionTypeTransformer.transform(
    updated,
  );
}
