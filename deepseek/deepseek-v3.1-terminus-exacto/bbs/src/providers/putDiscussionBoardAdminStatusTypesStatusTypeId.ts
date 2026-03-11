import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusTypeTransformer } from "../transformers/DiscussionBoardStatusTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminStatusTypesStatusTypeId(props: {
  admin: AdminPayload;
  statusTypeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusType.IUpdate;
}): Promise<IDiscussionBoardStatusType> {
  // Verify the status type exists
  const existing =
    await MyGlobal.prisma.discussion_board_status_types.findUniqueOrThrow({
      where: { id: props.statusTypeId },
    });
  // Check for unique constraint violation if category or code are being updated
  if (props.body.category !== undefined || props.body.code !== undefined) {
    const category = props.body.category ?? existing.category;
    const code = props.body.code ?? existing.code;
    const conflicting =
      await MyGlobal.prisma.discussion_board_status_types.findFirst({
        where: {
          category,
          code,
          id: { not: props.statusTypeId },
          deleted_at: null,
        },
      });
    if (conflicting) {
      throw new HttpException(
        "Status type with this category and code combination already exists",
        400,
      );
    }
  }
  // Validate display_order if being updated
  if (props.body.display_order !== undefined && props.body.display_order < 0) {
    throw new HttpException(
      "Display order must be a non-negative integer",
      400,
    );
  }
  // Build update data
  const updateData: Prisma.discussion_board_status_typesUpdateInput = {
    ...(props.body.category !== undefined && { category: props.body.category }),
    ...(props.body.code !== undefined && { code: props.body.code }),
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.description !== undefined && {
      description:
        props.body.description === null ? null : props.body.description,
    }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  };
  // Perform update
  await MyGlobal.prisma.discussion_board_status_types.update({
    where: { id: props.statusTypeId },
    data: updateData,
  });
  // Fetch updated record with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_status_types.findUniqueOrThrow({
      where: { id: props.statusTypeId },
      ...DiscussionBoardStatusTypeTransformer.select(),
    });
  return await DiscussionBoardStatusTypeTransformer.transform(updated);
}
