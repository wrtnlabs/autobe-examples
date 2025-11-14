import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCitizenLogin(props: {
  body: IPoliticalForumCitizen.ILogin;
}): Promise<IPoliticalForumCitizen.IAuthorized> {
  // The ILogin interface is incorrectly defined as string in the DTO, but the operation requires an object
  // This is a DTO definition error. We'll assume the runtime data is an object as required by the operation
  const body = props.body as any;

  const citizen = await MyGlobal.prisma.political_forum_citizens.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!citizen) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    body.password,
    citizen.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.political_forum_citizen_sessions.create(
    {
      data: {
        id: v4(),
        political_forum_citizen_id: citizen.id,
        ip: body.ip,
        href: body.href,
        referrer: body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
      },
    },
  );

  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = session.id;

  return {
    id: citizen.id,
    email: citizen.email,
    display_name: body.display_name ?? "",
    email_verified: citizen.email_verified,
    access_token: accessToken,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IPoliticalForumCitizen.IAuthorized;
}
