import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: IGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  let decodedRaw: unknown = null;
  try {
    decodedRaw = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate and assert decodedRaw as autoPartialDecoded
  type autoPartialDecoded = {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  const decoded = typia.assert<autoPartialDecoded>(decodedRaw);

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const nowISO = toISOStringSafe(new Date());
  const accessExpiresISO = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiresISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id satisfies string as string,
      session_id: decoded.session_id satisfies string as string,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id satisfies string as string,
      session_id: decoded.session_id satisfies string as string,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: decoded.id satisfies string as string,
    token: {
      access,
      refresh,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  };
}
