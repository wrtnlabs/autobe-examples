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

export async function putRedditCommunityAdminRedditCommunityAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRedditCommunityAdmin.IUpdate;
}): Promise<IRedditCommunityRedditCommunityAdmin> {
  const existingAdmin =
    await MyGlobal.prisma.reddit_community_admins.findUnique({
      where: { id: props.id },
    });

  if (existingAdmin === null) {
    throw new HttpException("Admin account not found", 404);
  }

  if (
    props.body.email !== undefined &&
    props.body.email !== existingAdmin.email
  ) {
    const duplicate = await MyGlobal.prisma.reddit_community_admins.findUnique({
      where: { email: props.body.email },
    });

    if (duplicate !== null) {
      throw new HttpException("Email already in use by another admin", 400);
    }
  }

  const hashedPassword = props.body.password
    ? await PasswordUtil.hash(props.body.password)
    : undefined;

  const updatedAdmin = await MyGlobal.prisma.reddit_community_admins.update({
    where: { id: props.id },
    data: {
      email: props.body.email,
      password_hash: hashedPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
    deleted_at:
      updatedAdmin.deleted_at === null
        ? null
        : toISOStringSafe(updatedAdmin.deleted_at),
  };
}
