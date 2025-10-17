import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertRefresh";
import { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthVerifiedExpertRefresh(props: {
  body: IEconDiscussVerifiedExpertRefresh.ICreate;
}): Promise<IEconDiscussVerifiedExpert.IAuthorized> {
  const { body } = props;

  let decoded: jwt.JwtPayload;
  try {
    const payload = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    if (typeof payload === "string") {
      throw new HttpException("Unauthorized", 401);
    }
    decoded = payload;
  } catch {
    throw new HttpException("Unauthorized", 401);
  }

  const tokenType = decoded.tokenType;
  const roleType = decoded.type;
  const subjectId =
    typeof decoded.id === "string"
      ? decoded.id
      : typeof decoded.userId === "string"
        ? decoded.userId
        : undefined;
  if (tokenType !== "refresh" || roleType !== "verifiedExpert" || !subjectId) {
    throw new HttpException("Unauthorized", 401);
  }

  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: subjectId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("Unauthorized", 401);
  }

  const accessPayload: { id: string; type: "verifiedExpert" } = {
    id: user.id,
    type: "verifiedExpert",
  };
  const refreshPayload: {
    id: string;
    type: "verifiedExpert";
    tokenType: "refresh";
  } = {
    id: user.id,
    type: "verifiedExpert",
    tokenType: "refresh",
  };

  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    role: "verifiedExpert",
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    email_verified: user.email_verified,
    mfa_enabled: user.mfa_enabled,
    display_name: user.display_name,
    ...(user.timezone !== null && { timezone: user.timezone }),
    ...(user.locale !== null && { locale: user.locale }),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
