import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestUserJoin(props: {
  body: ITodoAppGuestUser.IJoinRequest;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  const nowMillis = Date.now();
  const nowIso = toISOStringSafe(new Date(nowMillis));

  const accessTtlMillis = 60 * 60 * 1000; // 1 hour
  const refreshTtlMillis = 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiredAtIso = toISOStringSafe(
    new Date(nowMillis + accessTtlMillis),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(nowMillis + refreshTtlMillis),
  );

  const guestId = v4();
  const sessionId = v4();

  try {
    const createdGuest = await MyGlobal.prisma.todo_app_guestusers.create({
      data: {
        id: guestId,
        external_ref:
          props.body.external_ref !== undefined
            ? props.body.external_ref
            : null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    });

    const accessToken = jwt.sign(
      {
        type: "guestUser",
        id: guestId,
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
        id: guestId,
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

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAtIso,
      refreshable_until: refreshableUntilIso,
    };

    const response: ITodoAppGuestUser.IAuthorized = {
      id: createdGuest.id,
      external_ref:
        createdGuest.external_ref !== null ? createdGuest.external_ref : null,
      created_at: toISOStringSafe(createdGuest.created_at),
      updated_at: toISOStringSafe(createdGuest.updated_at),
      accessToken,
      refreshToken,
      token,
    };

    return response;
  } catch (error) {
    // In a real system, we would log `error` with a proper logger
    throw new HttpException("Failed to register guest user", 500);
  }
}
