import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!admin) {
    throw new HttpException("Unauthorized: Invalid email or password", 401);
  }

  const passwordMatch = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );
  if (!passwordMatch) {
    throw new HttpException("Unauthorized: Invalid email or password", 401);
  }

  const nowMillis = Date.now();

  const accessToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  function expToISOString(token: string): string & tags.Format<"date-time"> {
    const decoded = jwt.decode(token);
    if (
      decoded &&
      typeof decoded === "object" &&
      decoded !== null &&
      "exp" in decoded &&
      typeof decoded.exp === "number"
    ) {
      const millis = decoded.exp * 1000;
      const isoString = toISOStringSafe(new Date(millis));
      return isoString as string & tags.Format<"date-time">;
    }
    const fallback = toISOStringSafe(new Date(nowMillis));
    return fallback as string & tags.Format<"date-time">;
  }

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    full_name: admin.full_name ?? null,
    phone_number: admin.phone_number ?? null,
    status: typia.assert<"active" | "suspended" | "disabled">(admin.status),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    shopping_mall_report_count: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expToISOString(accessToken),
      refreshable_until: expToISOString(refreshToken),
    },
  };
}
