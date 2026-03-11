import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusTypeTransformer } from "../transformers/DiscussionBoardStatusTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminStatusTypesStatusTypeId(props: {
  superAdmin: SuperadminPayload;
  statusTypeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusType.IUpdate;
}): Promise<IDiscussionBoardStatusType> {
  // Verify the status type exists
  const existingStatusType =
    await MyGlobal.prisma.discussion_board_status_types.findUniqueOrThrow({
      where: { id: props.statusTypeId },
    });
  // Check for unique constraint violations if category or code is being updated
  if (props.body.category !== undefined || props.body.code !== undefined) {
    const newCategory = props.body.category ?? existingStatusType.category;
    const newCode = props.body.code ?? existingStatusType.code;
    const conflictingStatusType =
      await MyGlobal.prisma.discussion_board_status_types.findFirst({
        where: {
          id: { not: props.statusTypeId },
          category: newCategory,
          code: newCode,
        },
      });
    if (conflictingStatusType) {
      throw new HttpException(
        "Status type with this category and code combination already exists",
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_status_typesUpdateInput = {
    ...(props.body.category !== undefined && { category: props.body.category }),
    ...(props.body.code !== undefined && { code: props.body.code }),
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  };
  // Perform the update
  const updatedStatusType =
    await MyGlobal.prisma.discussion_board_status_types.update({
      where: { id: props.statusTypeId },
      data: updateData,
      ...DiscussionBoardStatusTypeTransformer.select(),
    });
  return await DiscussionBoardStatusTypeTransformer.transform(
    updatedStatusType,
  );
}
