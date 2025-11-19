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

export async function putDiscussionBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.IUpdate;
}): Promise<IDiscussionBoardModerator.ISummary> {
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException(
      "Forbidden: You can only update your own account",
      403,
    );
  }

  const existing = await MyGlobal.prisma.discussion_board_moderators.findUnique(
    {
      where: { id: props.moderatorId },
    },
  );

  if (!existing) {
    throw new HttpException("Moderator not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Moderator account has been deleted", 410);
  }

  if (props.body.email && props.body.email !== existing.email) {
    const emailExists =
      await MyGlobal.prisma.discussion_board_moderators.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.moderatorId },
          deleted_at: null,
        },
      });

    if (emailExists) {
      throw new HttpException(
        "Email address is already in use by another moderator",
        409,
      );
    }
  }

  if (props.body.username && props.body.username !== existing.username) {
    const usernameExists =
      await MyGlobal.prisma.discussion_board_moderators.findFirst({
        where: {
          username: props.body.username,
          id: { not: props.moderatorId },
          deleted_at: null,
        },
      });

    if (usernameExists) {
      throw new HttpException(
        "Username is already in use by another moderator",
        409,
      );
    }
  }

  const emailChanged = props.body.email && props.body.email !== existing.email;

  const updated = await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: props.moderatorId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password: await PasswordUtil.hash(props.body.password),
      }),
      ...(props.body.username !== undefined && {
        username: props.body.username,
      }),
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(emailChanged && {
        email_verified: false,
        email_verified_at: null,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    display_name: updated.display_name,
    email_verified: updated.email_verified,
    email_verified_at: updated.email_verified_at
      ? toISOStringSafe(updated.email_verified_at)
      : null,
    is_active: updated.is_active,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
