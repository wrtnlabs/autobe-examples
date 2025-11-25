import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityAdmin.IUpdate;
}): Promise<IRedditCommunityAdmin> {
  const existing = await MyGlobal.prisma.reddit_community_admins.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Reddit community admin not found", 404);
  }

  const updateData = {
    updated_at: toISOStringSafe(new Date()),
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.password !== undefined && {
      password_hash: await PasswordUtil.hash(props.body.password),
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at ?? null,
    }),
  };

  const updated = await MyGlobal.prisma.reddit_community_admins.update({
    where: { id: props.id },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
