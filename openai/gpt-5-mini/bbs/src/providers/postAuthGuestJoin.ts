import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuest.ICreate;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const { guest, body } = props;

  if (guest && guest.type !== "guest") {
    throw new HttpException("Unauthorized: invalid actor", 403);
  }

  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 4 * 60 * 60 * 1000);

  let created;
  try {
    created = await MyGlobal.prisma.discussion_board_guest.create({
      data: {
        id: guestId,
        display_name: body.displayName ?? null,
        ip: body.ip ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (e) {
    throw new HttpException(
      "Internal Server Error: failed to create guest",
      500,
    );
  }

  let access: string;
  let refresh: string;
  try {
    access = jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    );

    refresh = jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "4h", issuer: "autobe" },
    );
  } catch (e) {
    throw new HttpException(
      "Internal Server Error: failed to generate tokens",
      500,
    );
  }

  const token = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  return {
    id: created.id as string & tags.Format<"uuid">,
    displayName: created.display_name ?? undefined,
    ip: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token,
    guest: {
      id: created.id as string & tags.Format<"uuid">,
      display_name: created.display_name ?? null,
      created_at: now,
      updated_at: now,
    },
  };
}
