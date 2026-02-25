import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdministratorTransformer } from "../transformers/EcommerceAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthAdministratorLogin(props: {
  body: IEcommerceAdministrator.ILogin;
}): Promise<IEcommerceAdministrator.IAuthorized> {
  // Find administrator with password_hash
  const administrator =
    await MyGlobal.prisma.ecommerce_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        ...EcommerceAdministratorTransformer.select().select,
        password_hash: true,
      },
    });
  if (!administrator) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create session with current timestamp
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_administrator_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_administrator_id: administrator.id,
        access_token: v4(),
        refresh_token: v4(),
        ip_address: "", // Default empty string since IP not available in props
        user_agent: "", // Default empty string since user agent not available in props
        created_at: now,
        expires_at: accessExpires,
        last_used_at: now,
      },
    },
  );
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Return authorized response
  return {
    ...(await EcommerceAdministratorTransformer.transform(administrator)),
    token,
  } satisfies IEcommerceAdministrator.IAuthorized;
}
