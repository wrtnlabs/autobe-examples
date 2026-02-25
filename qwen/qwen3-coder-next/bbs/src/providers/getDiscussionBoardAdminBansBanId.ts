import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function getDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  // Query the ban record with the banned member's details
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.banId },
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        is_active: true,
        is_super_admin: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  // Transform the admin data to IDiscussionBoardMember format
  return {
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
    bio: null,
    isActive: admin.is_active,
    isAdmin: false,
    isSuperAdmin: admin.is_super_admin,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
  };
}
