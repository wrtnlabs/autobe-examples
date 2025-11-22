import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function putEconPoliticalDiscussionUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionUser.IUpdate;
}): Promise<IEconPoliticalDiscussionUser> {
  // Check if user exists
  const existing =
    await MyGlobal.prisma.econ_political_discussion_users.findUnique({
      where: { id: props.userId },
    });

  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  // Build update data filtering out null values for Prisma compatibility
  const hasUpdateFields =
    props.body.display_name !== undefined ||
    props.body.bio !== undefined ||
    props.body.avatar_url !== undefined ||
    props.body.status !== undefined;

  if (!hasUpdateFields) {
    throw new HttpException(
      "At least one field must be provided for update",
      400,
    );
  }

  const updateData: Record<string, unknown> = {};

  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined && props.body.bio !== null) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatar_url !== undefined && props.body.avatar_url !== null) {
    updateData.avatar_url = props.body.avatar_url;
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.econ_political_discussion_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Return the updated user profile with proper typing
  return {
    id: updated.id,
    display_name: updated.display_name,
    email: updated.email,
    bio: updated.bio,
    avatar_url: updated.avatar_url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
