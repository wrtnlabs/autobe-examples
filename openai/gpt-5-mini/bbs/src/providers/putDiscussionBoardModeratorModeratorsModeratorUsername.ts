import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator.ISummary> {
  const { moderator, moderatorUsername, body } = props;

  // Business rule: forbid attempts to change username or credential fields
  if (
    "username" in body ||
    "password" in (body as Record<string, unknown>) ||
    "password_hash" in (body as Record<string, unknown>)
  ) {
    throw new HttpException(
      "Bad Request: Attempt to modify forbidden fields",
      400,
    );
  }

  // Locate moderator by username
  const existing = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { username: moderatorUsername },
  });

  if (!existing) throw new HttpException("Not Found", 404);

  // Authorization: only the moderator themselves may update their own profile
  if (existing.id !== moderator.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own moderator profile",
      403,
    );
  }

  // If email is provided (non-null), ensure uniqueness
  if (body.email !== undefined && body.email !== null) {
    const conflict = await MyGlobal.prisma.discussion_board_moderator.findFirst(
      {
        where: {
          email: body.email,
          id: { not: existing.id },
        },
      },
    );
    if (conflict)
      throw new HttpException("Conflict: email already in use", 409);
  }

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Update allowed fields inline
  const updated = await MyGlobal.prisma.discussion_board_moderator.update({
    where: { id: existing.id },
    data: {
      email: body.email ?? undefined,
      display_name:
        body.displayName === null ? null : (body.displayName ?? undefined),
      updated_at: now,
    },
  });

  // Map DB result to summary DTO, converting Dates to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    display_name:
      updated.display_name === null
        ? null
        : (updated.display_name ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
