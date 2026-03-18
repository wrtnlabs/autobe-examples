import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerJoin(props: {
  ip: string;
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const now = new Date();
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const customerId = v4();
  const sessionId = v4();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_customers.create({
      data: {
        id: customerId,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        account_status: "active",
        banned_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
    await prisma.shopping_mall_customer_sessions.create({
      data: {
        id: sessionId,
        customer: { connect: { id: customerId } },
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: refreshExpiredAt,
      },
    });
  });
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        account_status: true,
        banned_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: sessionId,
        created_at: now.toISOString(),
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt.toISOString(),
    refreshable_until: refreshExpiredAt.toISOString(),
  } satisfies IAuthorizationToken;
  return {
    id: customer.id,
    email: customer.email,
    accountStatus: customer.account_status,
    bannedAt: customer.banned_at?.toISOString() ?? null,
    deletedAt: customer.deleted_at?.toISOString() ?? null,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
    profile:
      customer.profile === null
        ? null
        : {
            id: customer.profile.id,
            customer: {
              id: customer.id,
              email: customer.email,
              accountStatus: customer.account_status,
              bannedAt: customer.banned_at?.toISOString() ?? null,
              deletedAt: customer.deleted_at?.toISOString() ?? null,
              createdAt: customer.created_at.toISOString(),
              updatedAt: customer.updated_at.toISOString(),
            },
            displayName: customer.profile.display_name,
            phoneNumber: customer.profile.phone_number,
            createdAt: customer.profile.created_at.toISOString(),
            updatedAt: customer.profile.updated_at.toISOString(),
            deletedAt: customer.profile.deleted_at?.toISOString() ?? null,
          },
    token,
  };
}
