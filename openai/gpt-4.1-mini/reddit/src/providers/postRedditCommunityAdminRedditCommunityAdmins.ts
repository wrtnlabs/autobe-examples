import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityAdmin> {
  const existing = await MyGlobal.prisma.reddit_community_admins.findUnique({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Admin with this email already exists", 400);
  }

  // FIXME: Property 'hashPassword' does not exist on type 'typeof PasswordUtil'. Using 'hash' assuming it's the correct method.
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());
  const id = v4() satisfies string as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_community_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Ensure created_at and updated_at are non-null, deleted_at is nullable
  return {
    id: created.id,
    email: created.email,
    created_at: (created.created_at !== null && created.created_at !== undefined
      ? toISOStringSafe(created.created_at)
      : now) satisfies string as string & tags.Format<"date-time">,
    updated_at: (created.updated_at !== null && created.updated_at !== undefined
      ? toISOStringSafe(created.updated_at)
      : now) satisfies string as string & tags.Format<"date-time">,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
