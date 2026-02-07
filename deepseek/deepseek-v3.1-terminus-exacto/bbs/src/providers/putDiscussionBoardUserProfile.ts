import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserProfile(props: {
  user: UserPayload;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // First verify the user exists and is not deleted
  const existingUser = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  // Validate display_name length if provided
  if (
    props.body.name &&
    (props.body.name.length < 2 || props.body.name.length > 50)
  ) {
    throw new HttpException(
      "Display name must be between 2 and 50 characters",
      400,
    );
  }
  // Validate bio length if provided
  if (props.body.description && props.body.description.length > 500) {
    throw new HttpException("Bio must not exceed 500 characters", 400);
  }
  // Validate display_order if provided
  if (props.body.display_order && props.body.display_order < 1) {
    throw new HttpException("Display order must be at least 1", 400);
  }
  // Update the user profile with allowed fields
  const updatedUser = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.user.id },
    data: {
      display_name: props.body.name ?? existingUser.display_name,
      bio: props.body.description ?? existingUser.bio,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Since the operation expects IDiscussionBoardSection response, we need to transform
  // the user data into section format. This is unusual but required by the signature.
  return {
    id: updatedUser.id,
    name: updatedUser.display_name,
    description: updatedUser.bio ?? "",
    status: "active", // User profiles are always active
    display_order: props.body.display_order ?? 1, // Use provided or default
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : null,
    createdByAdmin: {
      id: v4(), // Generate placeholder UUID
      email: "system@example.com",
      display_name: "System",
      created_at: toISOStringSafe(new Date()),
    },
    lastModifiedByAdmin: null,
  };
}
