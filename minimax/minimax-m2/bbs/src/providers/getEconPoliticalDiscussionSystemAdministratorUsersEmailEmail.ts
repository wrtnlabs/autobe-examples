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

export async function getEconPoliticalDiscussionSystemAdministratorUsersEmailEmail(props: {
  systemAdministrator: SystemadministratorPayload;
  email: string;
}): Promise<IEconPoliticalDiscussionUser> {
  const user = await MyGlobal.prisma.econ_political_discussion_users.findUnique(
    {
      where: { email: props.email },
    },
  );

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
