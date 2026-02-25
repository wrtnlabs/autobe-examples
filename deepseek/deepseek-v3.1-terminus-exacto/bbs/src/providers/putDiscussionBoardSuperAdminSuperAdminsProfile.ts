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

export async function putDiscussionBoardSuperAdminSuperAdminsProfile(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSuperAdmin.IUpdate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // First check if the super admin exists and is active
  const existing =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: props.superAdmin.id, deleted_at: null },
    });
  // Use type-safe property access
  const updateBody = typia.assert<IDiscussionBoardSuperAdmin.IUpdate>(
    props.body,
  ) as IDiscussionBoardSuperAdmin.IUpdate;
  // Check which fields exist - IUpdate only has permission_level
  const hasPermissionLevel =
    "permission_level" in updateBody &&
    updateBody.permission_level !== undefined;
  // Update the super admin's section administrator assignment, not the super admin profile
  // Since this endpoint is about updating section administrator assignments
  if (hasPermissionLevel) {
    // Find the section assignment where this super admin is assigned
    const sectionAssignment =
      await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
        where: {
          discussion_board_super_admin_id: props.superAdmin.id,
          deleted_at: null,
        },
      });
    if (!sectionAssignment) {
      throw new HttpException("Super admin has no section assignments", 404);
    }
    // Update the permission level
    await MyGlobal.prisma.discussion_board_section_administrators.update({
      where: { id: sectionAssignment.id },
      data: {
        permission_level: updateBody.permission_level,
        updated_at: new Date(),
      },
    });
  }
  // Get the updated section assignment using the transformer
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirstOrThrow(
      {
        where: {
          discussion_board_super_admin_id: props.superAdmin.id,
          deleted_at: null,
        },
        ...DiscussionBoardSuperAdminTransformer.select(),
      },
    );
  // Return the transformed section administrator data
  return await DiscussionBoardSuperAdminTransformer.transform(
    updatedAssignment,
  );
}
