import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerResetRequest(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const { email } = props.body;
  // Generate token and expiration
  const token_id = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const expires_at = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const nowISO = toISOStringSafe(now) as string & tags.Format<"date-time">;
  // Find customer (security: don't reveal if account exists)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      email,
      deleted_at: null,
    },
  });
  // Start transaction for atomic operations
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Invalidate any active reset tokens for this customer
    if (customer) {
      await prisma.shopping_mall_customer_password_resets.updateMany({
        where: {
          shopping_mall_customer_id: customer.id,
          expires_at: { gt: nowISO },
        },
        data: { expires_at: nowISO },
      });
    }
    // Insert new reset record
    // Conditionally include shopping_mall_customer_id only if customer exists
    const createData: any = {
      id: token_id,
      token: v4(),
      expires_at,
      created_at: nowISO,
      updated_at: nowISO,
    };
    if (customer) {
      createData.shopping_mall_customer_id = customer.id;
    }
    await prisma.shopping_mall_customer_password_resets.create({
      data: createData,
    });
  });
  // Log request (without exposing whether customer existed)
  // Add required id and severity properties per schema
  await MyGlobal.prisma.shopping_mall_system_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "password_reset_request",
      metadata: JSON.stringify({ email }),
      created_at: nowISO,
      severity: "info", // Minimum required severity level
    },
  });
  // Return audit token_id (which is the reset token ID)
  // Response type IShoppingMallCustomerPasswordReset only has email
  return { email };
}
