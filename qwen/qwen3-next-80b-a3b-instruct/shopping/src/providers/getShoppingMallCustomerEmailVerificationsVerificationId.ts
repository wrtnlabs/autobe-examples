import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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

export async function getShoppingMallCustomerEmailVerificationsVerificationId(props: {
  customer: CustomerPayload;
  verificationId: string;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const verification =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findUnique(
      {
        where: {
          token: props.verificationId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_customer_id: true,
          expires_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (!verification) {
    throw new HttpException("Verification not found", 404);
  }
  return {
    id: verification.id,
    shopping_mall_customer_id: verification.shopping_mall_customer_id,
    expires_at: toISOStringSafe(verification.expires_at),
    created_at: toISOStringSafe(verification.created_at),
    updated_at: toISOStringSafe(verification.updated_at),
  };
}
