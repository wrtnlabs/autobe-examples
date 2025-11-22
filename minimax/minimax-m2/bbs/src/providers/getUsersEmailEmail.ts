import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function getUsersEmailEmail(props: {
  systemAdministrator: SystemadministratorPayload;
  email: string & tags.Format<"email">;
}): Promise<IEconPoliticalDiscussionUser> {
  // Query user by email from the econ_political_discussion_users table
  const user = await MyGlobal.prisma.econ_political_discussion_users.findUnique(
    {
      where: {
        email: props.email,
      },
    },
  );

  // Return 404 if user not found
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Convert and return user data with proper type handling
  return {
    id: user.id as string & tags.Format<"uuid">,
    display_name: user.display_name,
    email: user.email as string & tags.Format<"email">,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  };
}
