import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  const { body } = props;

  // Prepare values
  const id = v4() as string & tags.Format<"uuid">;
  const created_at = toISOStringSafe(new Date());

  // Token lifetime values
  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  try {
    const created = await MyGlobal.prisma.todo_app_guest.create({
      data: {
        id,
        email: body.email ?? null,
        created_at: created_at,
        status: "active",
      },
    });

    // JWT payloads
    const accessToken = jwt.sign(
      {
        id: created.id,
        type: "guest",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: created.id,
        tokenType: "refresh",
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
      expired_at: accessExp,
      refreshable_until: refreshExp,
    };

    const response: ITodoAppGuest.IAuthorized = {
      id: created.id as string & tags.Format<"uuid">,
      email: created.email ?? null,
      created_at: created_at as string & tags.Format<"date-time">,
      last_active_at: null,
      status: created.status ?? null,
      token,
    };

    return response;
  } catch (err) {
    // Prisma known errors could be handled here, fallback to 500
    throw new HttpException("Internal Server Error", 500);
  }
}
