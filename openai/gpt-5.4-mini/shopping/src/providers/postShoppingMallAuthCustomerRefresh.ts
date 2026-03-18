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

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const decoded = typia.assert<{
    type: "customer";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  }>(
    jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirstOrThrow({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
      },
      select: {
        id: true,
        expired_at: true,
      },
    });
  if (session.expired_at.getTime() < Date.now())
    throw new HttpException("Session expired or revoked", 401);
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
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
  if (customer.deleted_at !== null)
    throw new HttpException("Account has been deleted", 403);
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshableUntil },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe", expiresIn: "1h" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe", expiresIn: "7d" },
    ),
    expired_at: accessExpiredAt.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshableUntil.toISOString() as string &
      tags.Format<"date-time">,
  };
  const customerSummary = {
    id: customer.id,
    email: customer.email,
    accountStatus: customer.account_status,
    bannedAt: customer.banned_at?.toISOString() ?? null,
    deletedAt: null,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
  } satisfies IShoppingMallCustomer.ISummary;
  return {
    ...customerSummary,
    profile:
      customer.profile === null
        ? null
        : ({
            id: customer.profile.id,
            customer: customerSummary,
            displayName: customer.profile.display_name,
            phoneNumber: customer.profile.phone_number,
            createdAt: customer.profile.created_at.toISOString(),
            updatedAt: customer.profile.updated_at.toISOString(),
            deletedAt: customer.profile.deleted_at?.toISOString() ?? null,
          } satisfies IShoppingMallCustomerProfile),
    token,
  };
}
