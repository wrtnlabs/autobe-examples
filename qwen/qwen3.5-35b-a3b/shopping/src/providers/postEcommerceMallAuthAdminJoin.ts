import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminJoin(props: {
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  const { email, password, href, referrer, ip } = props.body;
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findFirst({
      where: {
        deleted_at: null,
        request_status: "approved",
      },
      include: {
        customerRequests: true,
        sellerRequests: true,
      },
    });
  if (!adminRequest) {
    throw new HttpException("Admin request not found or not approved", 404);
  }
  const isCustomerRequest =
    adminRequest.customerRequests !== null &&
    adminRequest.customerRequests !== undefined;
  const sellerRequest = adminRequest.sellerRequests;
  const customerRequest = adminRequest.customerRequests;
  if (isCustomerRequest) {
    const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
      where: { id: customerRequest!.customer_id },
    });
    if (!customer || customer.email !== email) {
      throw new HttpException("Admin request not found or not approved", 404);
    }
  } else if (sellerRequest) {
    const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
      where: { id: sellerRequest.seller_id },
    });
    if (!seller || seller.email !== email) {
      throw new HttpException("Admin request not found or not approved", 404);
    }
  }
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  const password_hash = await PasswordUtil.hash(password);
  const now = new Date();
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: email,
      password_hash: password_hash,
      is_banned: false,
      ban_reason: null,
      created_at: now,
      updated_at: now,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: ip ?? "",
      href: href,
      referrer: referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: admin.id,
    email: admin.email,
    is_banned: admin.is_banned,
    ban_reason: admin.ban_reason,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
