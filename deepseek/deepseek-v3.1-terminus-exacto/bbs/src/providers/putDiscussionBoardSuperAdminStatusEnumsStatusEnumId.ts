import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumTransformer } from "../transformers/DiscussionBoardStatusEnumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardSuperAdminStatusEnumsStatusEnumId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnum.IUpdate;
}): Promise<IDiscussionBoardStatusEnum> {
  // Verify the status enum exists
  const existing =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId },
    });
  // Check for unique constraint violations
  if (props.body.entity_type !== undefined || props.body.value !== undefined) {
    const entityType = props.body.entity_type ?? existing.entity_type;
    const value = props.body.value ?? existing.value;
    const conflicting =
      await MyGlobal.prisma.discussion_board_status_enums.findFirst({
        where: {
          entity_type: entityType,
          value: value,
          id: { not: props.statusEnumId },
          deleted_at: null,
        },
      });
    if (conflicting) {
      throw new HttpException(
        "Status enum with this entity_type and value combination already exists",
        400,
      );
    }
  }
  // Validate value follows snake_case format if provided
  if (props.body.value !== undefined) {
    const snakeCaseRegex = /^[a-z]+(_[a-z]+)*$/;
    if (!snakeCaseRegex.test(props.body.value)) {
      throw new HttpException(
        "Status value must follow snake_case format (lowercase letters separated by underscores)",
        400,
      );
    }
  }
  // Validate entity_type against known domain types if provided
  if (props.body.entity_type !== undefined) {
    const validEntityTypes = [
      "article",
      "comment",
      "admin_request",
      "user",
      "ban",
      "attachment",
    ];
    if (!validEntityTypes.includes(props.body.entity_type)) {
      throw new HttpException(
        `Invalid entity_type. Must be one of: ${validEntityTypes.join(", ")}`,
        400,
      );
    }
  }
  // Build update data with only provided fields
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
  try {
    // Apply optimistic locking
    const updated = await MyGlobal.prisma.discussion_board_status_enums.update({
      where: {
        id: props.statusEnumId,
        updated_at: existing.updated_at, // Optimistic lock
      },
      data: updateData,
      ...DiscussionBoardStatusEnumTransformer.select(),
    });
    // Log the update operation for audit purposes
    await MyGlobal.prisma.discussion_board_system_audit_logs.create({
      data: {
        id: v4(),
        action_type: "status_enum_update",
        action_category: "system_management",
        action_description: `SuperAdmin ${props.superAdmin.id} updated status enum ${props.statusEnumId}`,
        actor_type: "super_admin",
        target_type: "status_enum",
        target_id: props.statusEnumId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return await DiscussionBoardStatusEnumTransformer.transform(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException(
        "Status enum was modified by another user. Please refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
