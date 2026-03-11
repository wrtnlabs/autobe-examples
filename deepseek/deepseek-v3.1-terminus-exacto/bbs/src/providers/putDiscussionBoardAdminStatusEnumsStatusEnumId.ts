import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardAdminStatusEnumsStatusEnumId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnum.IUpdate;
}): Promise<IDiscussionBoardStatusEnum> {
  // Validate that the statusEnumId exists
  const existingStatusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId },
    });
  // Check for unique constraint violations if entity_type or value are being updated
  if (props.body.entity_type !== undefined || props.body.value !== undefined) {
    const entityType = props.body.entity_type ?? existingStatusEnum.entity_type;
    const value = props.body.value ?? existingStatusEnum.value;
    const conflictingStatusEnum =
      await MyGlobal.prisma.discussion_board_status_enums.findFirst({
        where: {
          entity_type: entityType,
          value: value,
          id: { not: props.statusEnumId },
          deleted_at: null,
        },
      });
    if (conflictingStatusEnum) {
      throw new HttpException(
        "Status enum with this entity_type and value combination already exists",
        400,
      );
    }
  }
  // Apply optimistic locking using updated_at
  const updateData: Prisma.discussion_board_status_enumsUpdateInput = {
    ...(props.body.entity_type !== undefined && {
      entity_type: props.body.entity_type,
    }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.sort_order !== undefined && {
      sort_order: props.body.sort_order,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  };
  const updatedStatusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.update({
      where: { id: props.statusEnumId },
      data: updateData,
      select: {
        id: true,
        entity_type: true,
        value: true,
        description: true,
        sort_order: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Log the update operation for audit purposes
  await MyGlobal.prisma.discussion_board_system_audit_logs.create({
    data: {
      id: v4(),
      action_type: "status_enum_update",
      action_category: "content_modification",
      action_description: "Updated status enumeration value",
      target_type: "status_enum",
      target_id: props.statusEnumId,
      actor_type: "admin",
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return {
    id: updatedStatusEnum.id,
    entity_type: updatedStatusEnum.entity_type,
    value: updatedStatusEnum.value,
    description: updatedStatusEnum.description,
    sort_order: updatedStatusEnum.sort_order,
    is_active: updatedStatusEnum.is_active,
    created_at: updatedStatusEnum.created_at.toISOString(),
    updated_at: updatedStatusEnum.updated_at.toISOString(),
    deleted_at: updatedStatusEnum.deleted_at
      ? updatedStatusEnum.deleted_at.toISOString()
      : null,
  };
}
