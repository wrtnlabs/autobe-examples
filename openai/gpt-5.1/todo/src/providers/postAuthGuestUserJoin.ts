import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestUserJoin(props: {
  body: ITodoAppGuestUser.IJoin;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  const nowDate = new Date();
  const nowIso = toISOStringSafe(nowDate);

  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);

  try {
    const createdGuest = await MyGlobal.prisma.todo_app_guestusers.create({
      data: {
        id: v4(),
        display_name: props.body.display_name ?? null,
        created_at: nowDate,
        updated_at: nowDate,
        deleted_at: null,
      },
    });

    const sessionId = v4();

    const accessToken = jwt.sign(
      {
        type: "guestUser",
        id: createdGuest.id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        type: "guestUser",
        id: createdGuest.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const authorized: ITodoAppGuestUser.IAuthorized = {
      id: createdGuest.id,
      display_name: createdGuest.display_name,
      created_at: toISOStringSafe(createdGuest.created_at),
      updated_at: toISOStringSafe(createdGuest.updated_at),
      deleted_at: createdGuest.deleted_at
        ? toISOStringSafe(createdGuest.deleted_at)
        : null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiresIso,
        refreshable_until: refreshExpiresIso,
      },
    };

    return authorized;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Failed to create guest user", 500);
    }

    throw error;
  }
}
