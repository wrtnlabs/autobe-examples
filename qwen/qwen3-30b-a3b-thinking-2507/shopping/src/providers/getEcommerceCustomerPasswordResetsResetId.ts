import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerPasswordResetTransformer } from "../transformers/EcommerceCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerPasswordResetsResetId(props: {
  customer: CustomerPayload;
  resetId: string;
}): Promise<IEcommerceCustomerPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.ecommerce_customer_password_resets.findUnique({
      where: { id: props.resetId },
      ...EcommerceCustomerPasswordResetTransformer.select(),
    });
  if (!resetRecord) {
    throw new HttpException("Password reset token not found", 404);
  }
  if (resetRecord.deleted_at !== null) {
    throw new HttpException("Password reset token not found", 404);
  }
  if (resetRecord.expires_at < new Date()) {
    throw new HttpException("Password reset token expired", 404);
  }
  return await EcommerceCustomerPasswordResetTransformer.transform(resetRecord);
}
