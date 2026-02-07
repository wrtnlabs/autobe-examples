import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorCapability";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdministratorsAdministratorIdCapabilities(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IUpdate;
}): Promise<IPageIDiscussionBoardAdministratorCapability> {
  // Verify target administrator exists and is active
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administratorId,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found or inactive", 404);
  }
  // Verify requesting admin is super administrator
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    });
  if (!superAdmin) {
    throw new HttpException(
      "Only super administrators can modify capabilities",
      403,
    );
  }
  // Validate update body has required fields
  if (!props.body.capability_type && !props.body.permission_level) {
    throw new HttpException(
      "At least one field (capability_type or permission_level) must be provided",
      400,
    );
  }
  // Validate capability_type if provided
  if (
    props.body.capability_type &&
    ![
      "content_moderation",
      "user_management",
      "section_admin",
      "system_config",
    ].includes(props.body.capability_type)
  ) {
    throw new HttpException(
      "Invalid capability_type. Must be one of: content_moderation, user_management, section_admin, system_config",
      400,
    );
  }
  // Validate permission_level if provided
  if (
    props.body.permission_level &&
    !["read_only", "full_access", "limited_scope"].includes(
      props.body.permission_level,
    )
  ) {
    throw new HttpException(
      "Invalid permission_level. Must be one of: read_only, full_access, limited_scope",
      400,
    );
  }
  const currentTime = toISOStringSafe(new Date());
  // Use transaction for atomic updates
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.capability_type) {
      // Check if capability already exists for this administrator
      const existingCapability =
        await tx.discussion_board_administrator_capabilities.findFirst({
          where: {
            discussion_board_administrator_id: props.administratorId,
            capability_type: props.body.capability_type,
            deleted_at: null,
          },
        });
      if (existingCapability) {
        // Update existing capability
        await tx.discussion_board_administrator_capabilities.update({
          where: { id: existingCapability.id },
          data: {
            permission_level:
              props.body.permission_level ??
              existingCapability.permission_level,
            updated_at: currentTime,
            assigned_by: props.admin.id,
          },
        });
      } else {
        // Create new capability
        await tx.discussion_board_administrator_capabilities.create({
          data: {
            id: v4(),
            discussion_board_administrator_id: props.administratorId,
            capability_type: props.body.capability_type,
            permission_level: props.body.permission_level ?? "read_only",
            assigned_by: props.admin.id,
            created_at: currentTime,
            updated_at: currentTime,
            deleted_at: null,
          },
        });
      }
    } else if (props.body.permission_level) {
      // Update all capabilities for this administrator with new permission level
      await tx.discussion_board_administrator_capabilities.updateMany({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        data: {
          permission_level: props.body.permission_level,
          updated_at: currentTime,
          assigned_by: props.admin.id,
        },
      });
    }
    // Get all active capabilities for this administrator
    const capabilities =
      await tx.discussion_board_administrator_capabilities.findMany({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityTransformer.select(),
      });
    return capabilities;
  });
  // Transform capabilities using the transformer
  const transformedCapabilities = await ArrayUtil.asyncMap(
    result,
    DiscussionBoardAdministratorCapabilityTransformer.transform,
  );
  return {
    pagination: {
      current: 1,
      limit: transformedCapabilities.length,
      records: transformedCapabilities.length,
      pages: 1,
    } satisfies IPage.IPagination,
    data: transformedCapabilities,
  };
}
