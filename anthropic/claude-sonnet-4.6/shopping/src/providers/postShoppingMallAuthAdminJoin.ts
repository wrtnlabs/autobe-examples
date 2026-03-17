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

export async function postShoppingMallAuthAdminJoin(props: {
  ip: string;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Check duplicate email in admins table → 409 Conflict
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existingAdmin !== null) {
    throw new HttpException("Email already registered as admin", 409);
  }
  // 2. Resolve actor_type by looking up originating customer or seller account
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
      select: { id: true },
    });
  let actorType: "customer" | "seller";
  let originId: string;
  if (existingCustomer !== null) {
    actorType = "customer";
    originId = existingCustomer.id;
  } else {
    const existingSeller =
      await MyGlobal.prisma.shopping_mall_sellers.findFirst({
        where: { email: props.body.email },
        select: { id: true },
      });
    if (existingSeller === null) {
      throw new HttpException(
        "No matching customer or seller account found for this email",
        404,
      );
    }
    actorType = "seller";
    originId = existingSeller.id;
  }
  // 3. Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create admin record
  const adminId = v4();
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: adminId,
      actor_type: actorType,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create polymorphic origin linkage record (adminOfCustomer or adminOfSeller)
  if (actorType === "customer") {
    await MyGlobal.prisma.shopping_mall_admin_of_customers.create({
      data: {
        id: v4(),
        admin_id: adminId,
        customer_id: originId,
        created_at: now,
      },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_admin_of_sellers.create({
      data: {
        id: v4(),
        admin_id: adminId,
        seller_id: originId,
        created_at: now,
      },
    });
  }
  // 6. Fetch the freshly created admin with all relations for transformation
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: adminId },
      ...ShoppingMallAdminTransformer.select(),
    });
  // 7. Generate JWT tokens
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Persist session record
  await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_admin_id: adminId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 9. Transform admin record to DTO
  const adminDto = await ShoppingMallAdminTransformer.transform(adminRecord);
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: adminDto.id,
    email: adminDto.email,
    actor_type: adminDto.actor_type,
    grade: adminDto.grade,
    origin: adminDto.origin,
    created_at: adminDto.created_at,
    updated_at: adminDto.updated_at,
    deleted_at: adminDto.deleted_at,
    token,
    admin: adminDto,
  };
}
