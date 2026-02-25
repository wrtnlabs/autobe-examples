import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IUpdate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Verify the requesting super_admin exists and is active
  const superAdminExists =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!superAdminExists) {
    throw new HttpException("Super administrator account not found", 404);
  }
  // Find the target administrator assignment
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  if (!assignment) {
    throw new HttpException("Administrator assignment not found", 404);
  }
  // Security: Prevent updating current user's own assignment
  if (assignment.superAdmin?.id === props.superAdmin.id) {
    throw new HttpException(
      "Cannot modify your own administrator assignment",
      403,
    );
  }
  // Validate permission_level if provided
  if (props.body.permission_level !== undefined) {
    if (props.body.permission_level.trim().length === 0) {
      throw new HttpException("Permission level cannot be empty", 400);
    }
    // Validate against allowed permission levels (basic validation)
    const allowedLevels = ["read", "write", "manage", "admin"];
    if (!allowedLevels.includes(props.body.permission_level)) {
      throw new HttpException("Invalid permission level", 400);
    }
  }
  // Return early if no changes are requested
  if (props.body.permission_level === undefined) {
    return await DiscussionBoardSuperAdminTransformer.transform(assignment);
  }
  // Update the assignment
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.update({
      where: { id: props.administratorId },
      data: {
        permission_level: props.body.permission_level,
        updated_at: new Date(),
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  return await DiscussionBoardSuperAdminTransformer.transform(
    updatedAssignment,
  );
}
