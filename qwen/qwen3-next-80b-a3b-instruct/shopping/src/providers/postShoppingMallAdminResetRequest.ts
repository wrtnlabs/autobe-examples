import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAdminResetRequest(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerPasswordReset;
}): Promise<IShoppingMallCustomerPasswordReset> {
  // Validate email format
  if (!typia.is<string & tags.Format<"email">>(props.body.email)) {
    throw new HttpException("Invalid email format", 400);
  }
  const oneHourAgo = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));
  const recentRequests = await MyGlobal.prisma.shopping_mall_system_logs.count({
    where: {
      event_type: "PASSWORD_RESET_REQUEST", // Fixed: 'event_type' from schema, not 'event_name'
      metadata: { contains: props.body.email },
      created_at: { gte: oneHourAgo },
    },
  });
  if (recentRequests >= 5) {
    throw new HttpException("Rate limit exceeded", 429);
  }
  const transaction = MyGlobal.prisma.$transaction(async (prisma) => {
    // Look up customer and seller
    const customer = await prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
    const seller = await prisma.shopping_mall_sellers.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
    // Determine user ID and table
    const userId = customer?.id ?? seller?.id;
    // Invalidate existing reset tokens for this email
    if (customer) {
      await prisma.shopping_mall_customer_password_resets.updateMany({
        where: { shopping_mall_customer_id: props.body.email },
        data: { token: "" }, // Use token field to mark as invalid, since deleted_at doesn't exist
      });
    }
    if (seller) {
      await prisma.shopping_mall_seller_password_resets.updateMany({
        where: { shopping_mall_seller_id: props.body.email },
        data: { token: "" },
      });
    }
    // Generate token
    const token_id: string & tags.Format<"uuid"> = v4();
    const issued_at: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );
    const expires_at: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    // Create reset record
    if (customer) {
      await prisma.shopping_mall_customer_password_resets.create({
        data: {
          id: token_id,
          shopping_mall_customer_id: customer.id,
          token: token_id,
          expires_at,
          created_at: issued_at,
          updated_at: issued_at,
        },
      });
    } else if (seller) {
      await prisma.shopping_mall_seller_password_resets.create({
        data: {
          id: token_id,
          shopping_mall_seller_id: seller.id,
          token: token_id,
          expires_at,
          created_at: issued_at,
          updated_at: issued_at,
        },
      });
    } else {
      // Dummy reset record for security
      const dummyUserId: string & tags.Format<"uuid"> = v4();
      await prisma.shopping_mall_customer_password_resets.create({
        data: {
          id: token_id,
          shopping_mall_customer_id: dummyUserId,
          token: token_id,
          expires_at,
          created_at: issued_at,
          updated_at: issued_at,
        },
      });
    }
    // Log request
    await prisma.shopping_mall_system_logs.create({
      data: {
        id: v4(), // Required field missing
        event_type: "PASSWORD_RESET_REQUEST",
        created_at: toISOStringSafe(new Date()),
        severity: "info",
        metadata: JSON.stringify({
          email: props.body.email,
          ip: "unknown",
          user_agent: "unknown",
        }),
      },
    });
    // Return response matching IShoppingMallCustomerPasswordReset: only email
    return { email: props.body.email };
  });
  return await transaction;
}
