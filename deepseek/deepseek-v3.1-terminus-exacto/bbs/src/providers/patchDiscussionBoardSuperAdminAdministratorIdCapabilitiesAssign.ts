import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorCapabilityAssignItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapabilityAssignItem";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorCapabilityAtAssignedListTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityAtAssignedListTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorIdCapabilitiesAssign(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IAssign;
}): Promise<IDiscussionBoardAdministratorCapability.IAssignedList> {
  // Validate that all capability types and permission levels are valid
  const validCapabilityTypes = [
    "content_moderation",
    "user_management",
    "section_admin",
    "system_config",
  ];
  const validPermissionLevels = ["read_only", "full_access", "limited_scope"];
  for (const capability of props.body.capabilities) {
    if (!validCapabilityTypes.includes(capability.capability_type)) {
      throw new HttpException(
        `Invalid capability type: ${capability.capability_type}`,
        400,
      );
    }
    if (!validPermissionLevels.includes(capability.permission_level)) {
      throw new HttpException(
        `Invalid permission level: ${capability.permission_level}`,
        400,
      );
    }
  }
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
  // Process capability assignments using transaction
  const currentTime = toISOStringSafe(new Date());
  const assignments = await MyGlobal.prisma.$transaction(async (tx) => {
    const results = [];
    for (const capability of props.body.capabilities) {
      // Check if capability already exists for this administrator
      const existingCapability =
        await tx.discussion_board_administrator_capabilities.findFirst({
          where: {
            discussion_board_administrator_id: props.administratorId,
            capability_type: capability.capability_type,
            deleted_at: null,
          },
        });
      let assignment;
      if (existingCapability) {
        // Update existing capability
        assignment =
          await tx.discussion_board_administrator_capabilities.update({
            where: { id: existingCapability.id },
            data: {
              permission_level: capability.permission_level,
              assigned_by: props.superAdmin.id,
              updated_at: currentTime,
            },
          });
      } else {
        // Create new capability
        assignment =
          await tx.discussion_board_administrator_capabilities.create({
            data: {
              id: v4(),
              discussion_board_administrator_id: props.administratorId,
              capability_type: capability.capability_type,
              permission_level: capability.permission_level,
              assigned_by: props.superAdmin.id,
              created_at: currentTime,
              updated_at: currentTime,
            },
          });
      }
      results.push(assignment);
    }
    return results;
  });
  // Fetch the first capability assignment with complete relations for the response
  const updatedCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findFirst(
      {
        where: {
          id: assignments[0].id,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityAtAssignedListTransformer.select(),
      },
    );
  if (!updatedCapability) {
    throw new HttpException("Failed to retrieve updated capability", 500);
  }
  return await DiscussionBoardAdministratorCapabilityAtAssignedListTransformer.transform(
    updatedCapability,
  );
}
