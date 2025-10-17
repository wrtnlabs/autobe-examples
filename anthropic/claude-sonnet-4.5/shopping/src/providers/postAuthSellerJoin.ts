import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSellerJoin(props: {
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
    {
      where: { email: body.email },
    },
  );

  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);
  const verificationToken = v4();
  const now = toISOStringSafe(new Date());

  const createdSeller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: hashedPassword,
      business_name: body.business_name,
      business_type: body.business_type,
      contact_person_name: body.contact_person_name,
      phone: body.phone,
      business_address: body.business_address,
      tax_id: body.tax_id,
      account_status: "pending_approval",
      email_verified: false,
      documents_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: now,
      failed_login_attempts: 0,
      commission_rate: 0.1,
      password_changed_at: now,
      password_history: JSON.stringify([]),
      created_at: now,
      updated_at: now,
      approved_by_admin_id: null,
      business_registration_number: null,
      bank_account_number: null,
      bank_routing_number: null,
      bank_account_holder_name: null,
      store_url_slug: null,
      store_description: null,
      store_logo_url: null,
      store_banner_url: null,
      approved_at: null,
      free_shipping_threshold: null,
      return_policy: null,
      shipping_policy: null,
      password_reset_token: null,
      password_reset_expires_at: null,
      failed_login_window_start_at: null,
      account_locked_until: null,
      deleted_at: null,
    },
  });

  const accessTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      id: createdSeller.id,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: createdSeller.id,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  return {
    id: createdSeller.id,
    email: createdSeller.email,
    business_name: createdSeller.business_name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
