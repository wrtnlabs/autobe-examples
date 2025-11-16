import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Prevent self-deletion / protected account deletion
  if (props.adminUser.id === props.adminUserId) {
    throw new HttpException(
      "You cannot delete your own administrator account.",
      400,
    );
  }

  // Ensure target admin user exists
  const existing = await MyGlobal.prisma.discussion_board_adminusers.findUnique(
    {
      where: {
        id: props.adminUserId,
      },
    },
  );

  if (existing === null) {
    throw new HttpException("Admin user not found.", 404);
  }

  try {
    await MyGlobal.prisma.discussion_board_adminusers.delete({
      where: {
        id: props.adminUserId,
      },
    });
  } catch (error) {
    // Handle referential integrity / FK constraint violations explicitly
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException(
        "Cannot delete admin user because related records depend on it.",
        409,
      );
    }

    throw error;
  }
}
