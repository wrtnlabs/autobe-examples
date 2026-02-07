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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilities(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IUpdate;
}): Promise<IPageIDiscussionBoardAdministratorCapability> {
  // Validate administrator exists and is active
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
  // Validate capability_type and permission_level if provided
  if (
    props.body.capability_type &&
    props.body.capability_type.trim().length === 0
  ) {
    throw new HttpException("Capability type cannot be empty", 400);
  }
  if (
    props.body.permission_level &&
    props.body.permission_level.trim().length === 0
  ) {
    throw new HttpException("Permission level cannot be empty", 400);
  }
  // Use transaction for atomic capability updates
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    // Get existing active capabilities for this administrator
    const existingCapabilities =
      await tx.discussion_board_administrator_capabilities.findMany({
        where: {
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
      });
    let updatedCapability;
    if (existingCapabilities.length > 0) {
      // Update the first existing capability (assuming single capability per admin for now)
      // In a real implementation, this would need to handle multiple capabilities
      updatedCapability =
        await tx.discussion_board_administrator_capabilities.update({
          where: { id: existingCapabilities[0].id },
          data: {
            capability_type:
              props.body.capability_type ??
              existingCapabilities[0].capability_type,
            permission_level:
              props.body.permission_level ??
              existingCapabilities[0].permission_level,
            assigned_by: props.superAdmin.id,
            updated_at: now,
          },
          ...DiscussionBoardAdministratorCapabilityTransformer.select(),
        });
    } else {
      // Create new capability assignment
      updatedCapability =
        await tx.discussion_board_administrator_capabilities.create({
          data: {
            id: v4(),
            discussion_board_administrator_id: props.administratorId,
            capability_type: props.body.capability_type ?? "content_moderation",
            permission_level: props.body.permission_level ?? "read_only",
            assigned_by: props.superAdmin.id,
            created_at: now,
            updated_at: now,
          },
          ...DiscussionBoardAdministratorCapabilityTransformer.select(),
        });
    }
    return updatedCapability;
  });
  // Get all active capabilities for paginated response
  const allCapabilities =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findMany({
      where: {
        discussion_board_administrator_id: props.administratorId,
        deleted_at: null,
      },
      ...DiscussionBoardAdministratorCapabilityTransformer.select(),
    });
  const totalCount =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.count({
      where: {
        discussion_board_administrator_id: props.administratorId,
        deleted_at: null,
      },
    });
  // Transform capabilities
  const transformedCapabilities = await ArrayUtil.asyncMap(
    allCapabilities,
    DiscussionBoardAdministratorCapabilityTransformer.transform,
  );
  return {
    pagination: {
      current: 1,
      limit: totalCount,
      records: totalCount,
      pages: 1,
    } satisfies IPage.IPagination,
    data: transformedCapabilities,
  };
}
