import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityRedditCommunityAdmin> {
  const id = v4() as string & tags.Format<"uuid">;
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const nowIso = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    created_at:
      created.created_at !== null && created.created_at !== undefined
        ? toISOStringSafe(created.created_at)
        : nowIso,
    updated_at:
      created.updated_at !== null && created.updated_at !== undefined
        ? toISOStringSafe(created.updated_at)
        : nowIso,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
