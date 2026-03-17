import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminLogin(props: {
  ip: string;
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash explicitly selected
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallAdminTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Not found → 401 (do not reveal whether email exists)
  if (!adminRecord) throw new HttpException("Invalid credentials", 401);
  // 3. Deactivated account → 401
  if (adminRecord.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    adminRecord.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 5. Compute expiry timestamps
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: adminRecord.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: adminRecord.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create new session record
  await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_admin_id: adminRecord.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 8. Transform admin record to IShoppingMallAdmin
  const admin = await ShoppingMallAdminTransformer.transform(adminRecord);
  // 9. Build token object
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 10. Return IShoppingMallAdmin.IAuthorized
  return {
    ...admin,
    token,
    admin,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
