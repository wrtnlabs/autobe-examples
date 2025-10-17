import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IEconPoliticalForumGuest.ICreate;
}): Promise<IEconPoliticalForumGuest.IAuthorized> {
  const { body } = props;

  if (!MyGlobal?.env?.JWT_SECRET_KEY) {
    throw new HttpException("Server misconfiguration: missing JWT secret", 500);
  }

  try {
    // Prepare timestamps once
    const now = toISOStringSafe(new Date());

    // Generate id for guest (schema requires id without @default)
    const id = v4() as string & tags.Format<"uuid">;

    // Create guest record. created_at and updated_at are required in schema.
    const created = await MyGlobal.prisma.econ_political_forum_guest.create({
      data: {
        id,
        nickname: body.nickname ?? null,
        user_agent: body.user_agent ?? null,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        nickname: true,
        user_agent: true,
      },
    });

    // Issue JWTs
    const accessToken = jwt.sign(
      { id: created.id, type: "guest" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      { id: created.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    // Token expirations in ISO strings
    const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    const refreshable_until = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      id: created.id as string & tags.Format<"uuid">,
      nickname: created.nickname ?? null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at,
        refreshable_until,
      },
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
