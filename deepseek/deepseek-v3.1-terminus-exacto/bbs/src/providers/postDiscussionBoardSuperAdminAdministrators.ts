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
import { DiscussionBoardSuperAdminCollector } from "../collectors/DiscussionBoardSuperAdminCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminAdministrators(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSuperAdmin.ICreate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Check if target user exists
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: {
      id: props.body.admin_id ? props.body.admin_id : undefined,
      deleted_at: null,
    },
  });
  // Check if user is already an administrator
  const existingAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { user_id: user.id },
    });
  if (existingAdmin) {
    throw new HttpException("User is already an administrator", 400);
  }
  // Create authentication record based on assignment type
  let adminId: (string & tags.Format<"uuid">) | null = null;
  let superAdminId: (string & tags.Format<"uuid">) | null = null;
  if (props.body.admin_id) {
    const adminRecord = await MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: v4(),
        email: user.email,
        password_hash: await PasswordUtil.hash("default_password"), // Default password can be changed later
        display_name: user.display_name,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    adminId = adminRecord.id as string & tags.Format<"uuid">;
  } else if (props.body.super_admin_id) {
    const superAdminRecord =
      await MyGlobal.prisma.discussion_board_super_admins.create({
        data: {
          id: v4(),
          email: user.email,
          password_hash: await PasswordUtil.hash("default_password"),
          privilege_level: "super",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    superAdminId = superAdminRecord.id as string & tags.Format<"uuid">;
  }
  // Create administrator assignment using collector
  const sectionAdminData = await DiscussionBoardSuperAdminCollector.collect({
    body: {
      ...props.body,
      admin_id: adminId,
      super_admin_id: superAdminId,
    },
    discussionBoardSections: { id: "section-id-placeholder" } as IEntity, // Section ID needs clarification
    discussionBoardAdmins: { id: props.superAdmin.id } as IEntity,
  });
  const createdAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.create({
      data: sectionAdminData,
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  return DiscussionBoardSuperAdminTransformer.transform(createdAssignment);
}
