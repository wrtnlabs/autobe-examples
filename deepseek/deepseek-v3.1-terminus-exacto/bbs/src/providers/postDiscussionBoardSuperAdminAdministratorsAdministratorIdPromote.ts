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

export async function postDiscussionBoardSuperAdminAdministratorsAdministratorIdPromote(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.IPromote;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Validate confirmation
  if (!props.body.confirmed) {
    throw new HttpException("Promotion must be confirmed", 400);
  }
  // Verify requesting super admin exists
  const requestingSuperAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirstOrThrow({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  // Verify target administrator exists and is not deleted
  const targetAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
    });
  // Check if administrator already has super privileges
  const existingSuperAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_admin_id: props.administratorId,
        permission_level: "super",
        deleted_at: null,
      },
    });
  if (existingSuperAssignment) {
    throw new HttpException(
      "Administrator already has super administrator privileges",
      400,
    );
  }
  // Find a system section to assign the administrator to
  const systemSection =
    await MyGlobal.prisma.discussion_board_sections.findFirstOrThrow({
      where: {
        name: "System",
        deleted_at: null,
      },
    });
  const now = new Date();
  // Create section administrator assignment with super privileges
  const promotion =
    await MyGlobal.prisma.discussion_board_section_administrators.create({
      data: {
        id: v4(),
        discussion_board_admin_id: props.administratorId,
        discussion_board_section_id: systemSection.id,
        permission_level: "super",
        assignment_date: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  // Create audit log for the promotion
  const metadata = props.body.reason
    ? JSON.stringify({ reason: props.body.reason })
    : null;
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdmin.id,
      actor_type: "super_admin",
      target_admin_id: props.administratorId,
      action_type: "admin_promotion",
      action_subtype: "regular_to_super",
      description: `Administrator ${targetAdmin.email} promoted to super admin by ${requestingSuperAdmin.email}`,
      metadata,
      success: true,
      error_message: null,
      ip_address: null,
      user_agent: null,
      created_at: now,
      updated_at: now,
    },
  });
  return await DiscussionBoardSuperAdminTransformer.transform(promotion);
}
