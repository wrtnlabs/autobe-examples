import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityRegisteredusersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityRegisteredUser> {
  const user =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: props.id },
    });

  if (user === null) {
    throw new HttpException("Registered user not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  };
}
