import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { moderator, body } = props;

  // Authorization required because moderator payload is provided
  const caller = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { id: moderator.id },
  });
  if (!caller || caller.deleted_at !== null) {
    throw new HttpException("Unauthorized: caller not found or inactive", 403);
  }

  // Uniqueness checks
  const existingByUsername =
    await MyGlobal.prisma.discussion_board_moderator.findFirst({
      where: { username: body.username },
    });
  if (existingByUsername)
    throw new HttpException("Username already registered", 409);

  const existingByEmail =
    await MyGlobal.prisma.discussion_board_moderator.findFirst({
      where: { email: body.email },
    });
  if (existingByEmail) throw new HttpException("Email already registered", 409);

  // Hash password
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare ids and timestamps
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create moderator and session in transaction
  const [createdModerator, createdSession] = await MyGlobal.prisma.$transaction(
    [
      MyGlobal.prisma.discussion_board_moderator.create({
        data: {
          id: moderatorId,
          username: body.username,
          email: body.email,
          password_hash,
          display_name: body.display_name ?? null,
          // role and mfa_enabled DO NOT exist on discussion_board_moderator schema - removed
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.discussion_board_moderator_sessions.create({
        data: {
          id: sessionId,
          discussion_board_moderator_id: moderatorId,
          ip: body.ip ?? "",
          href: body.href,
          referrer: body.referrer,
          created_at: now,
          expired_at: toISOStringSafe(accessExpires),
        },
      }),
    ],
  );

  // Generate tokens
  const tokenCreatedAt = toISOStringSafe(new Date());

  const access = jwt.sign(
    {
      type: "moderator",
      id: createdModerator.id,
      session_id: createdSession.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: "moderator",
      id: createdModerator.id,
      session_id: createdSession.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: createdModerator.id,
    username: createdModerator.username,
    email: createdModerator.email,
    display_name: createdModerator.display_name ?? null,
    created_at: toISOStringSafe(createdModerator.created_at),
    updated_at: toISOStringSafe(createdModerator.updated_at),
    token,
    moderator: {
      id: createdModerator.id,
      username: createdModerator.username,
      display_name: createdModerator.display_name ?? null,
      created_at: toISOStringSafe(createdModerator.created_at),
      updated_at: toISOStringSafe(createdModerator.updated_at),
      deleted_at: createdModerator.deleted_at
        ? toISOStringSafe(createdModerator.deleted_at)
        : null,
    },
  };
}
