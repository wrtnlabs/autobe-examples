import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerEmailVerifications(props: {
  body: IShoppingMallCustomerEmailVerification.ICreate;
}): Promise<IShoppingMallCustomerEmailVerification> {
  // Generate verification token and calculate expiration
  const token = v4();
  const expiredAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // Create the email verification record
  const verification =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        token,
        expired_at: expiredAt,
        customer: {
          connect: {
            id: "" as string & tags.Format<"uuid">, // Placeholder - should come from authenticated session
          },
        },
      },
    });
  return {
    id: verification.id as string & tags.Format<"uuid">,
    token: verification.token,
    expired_at: toISOStringSafe(verification.expired_at),
  };
}
