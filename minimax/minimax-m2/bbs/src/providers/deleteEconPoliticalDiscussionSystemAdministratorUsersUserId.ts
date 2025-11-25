import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function deleteEconPoliticalDiscussionSystemAdministratorUsersUserId(props: {
  systemAdministrator: SystemadministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalDiscussionUser> {
  // Check if user exists before deletion
  const existingUser =
    await MyGlobal.prisma.econ_political_discussion_users.findUnique({
      where: { id: props.userId },
    });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Delete the user from database
  const deletedUser =
    await MyGlobal.prisma.econ_political_discussion_users.delete({
      where: { id: props.userId },
    });

  // Return deleted user information with proper datetime conversion
  return {
    id: deletedUser.id,
    display_name: deletedUser.display_name,
    email: deletedUser.email,
    bio: deletedUser.bio,
    avatar_url: deletedUser.avatar_url,
    status: deletedUser.status,
    created_at: toISOStringSafe(deletedUser.created_at),
    updated_at: toISOStringSafe(deletedUser.updated_at),
    deleted_at: deletedUser.deleted_at
      ? toISOStringSafe(deletedUser.deleted_at)
      : null,
  };
}
