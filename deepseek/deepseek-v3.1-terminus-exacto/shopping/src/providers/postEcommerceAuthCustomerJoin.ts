import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

export async function postEcommerceAuthCustomerJoin(props: {
  body: IEcommerceCustomer.IJoin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // Validate request body using typia
  typia.assert<IEcommerceCustomer.IJoin>(props.body);
  // Check for existing customer with same email
  const existing = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create customer record with ISO string timestamps
  const customerId = v4() as string & tags.Format<"uuid">;
  const createdAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const updatedAt = createdAt;
  try {
    const customer = await MyGlobal.prisma.ecommerce_customers.create({
      data: {
        id: customerId,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        display_name: props.body.display_name,
        phone_number: props.body.phone_number,
        created_at: new Date(createdAt),
        updated_at: new Date(updatedAt),
        deleted_at: null,
      },
    });
    // Create email verification token
    const verificationToken = v4();
    const expiresAtTimestamp = Date.now() + 24 * 60 * 60 * 1000;
    const expiresAt = new Date(expiresAtTimestamp).toISOString() as string &
      tags.Format<"date-time">;
    await MyGlobal.prisma.ecommerce_customer_email_verifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_customer_id: customerId,
        token: verificationToken,
        expires_at: new Date(expiresAt),
        verified_at: null,
        created_at: new Date(createdAt),
        updated_at: new Date(updatedAt),
      },
    });
    // Note: Session creation should ideally happen in the login endpoint, not registration
    // For registration completion, we'll create skeleton session data
    const sessionExpiresAtTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sessionExpiresAt = new Date(
      sessionExpiresAtTimestamp,
    ).toISOString() as string & tags.Format<"date-time">;
    // Generate JWT tokens
    const tokenExpiresTimestamp = Date.now() + 60 * 60 * 1000;
    const tokenExpires = new Date(
      tokenExpiresTimestamp,
    ).toISOString() as string & tags.Format<"date-time">;
    const refreshExpiresTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const refreshExpires = new Date(
      refreshExpiresTimestamp,
    ).toISOString() as string & tags.Format<"date-time">;
    const tokenPayload = {
      type: "customer",
      id: customerId,
      session_id: customerId, // Using customerId as placeholder for session_id
      created_at: createdAt,
    };
    const token: IAuthorizationToken = {
      access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
        issuer: "autobe",
      }),
      refresh: jwt.sign(
        { ...tokenPayload, tokenType: "refresh" },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: tokenExpires,
      refreshable_until: refreshExpires,
    };
    return {
      id: customerId,
      email: customer.email,
      display_name: customer.display_name,
      phone_number: customer.phone_number,
      created_at: customer.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: customer.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: customer.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null,
      token,
    } satisfies IEcommerceCustomer.IAuthorized;
  } catch (error) {
    // Handle database errors appropriately
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Database error during registration", 500);
    }
    throw error;
  }
}
