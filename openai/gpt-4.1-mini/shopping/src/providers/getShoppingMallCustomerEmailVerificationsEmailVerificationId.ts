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

export async function getShoppingMallCustomerEmailVerificationsEmailVerificationId(props: {
  customer: CustomerPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findUnique(
      {
        where: { id: props.emailVerificationId },
      },
    );
  if (!record) {
    throw new HttpException("Email verification token not found", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    verified_at:
      record.verified_at === null ? null : toISOStringSafe(record.verified_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
