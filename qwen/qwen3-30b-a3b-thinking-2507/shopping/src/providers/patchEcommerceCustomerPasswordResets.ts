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
import { EcommerceCustomerPasswordResetAtSummaryTransformer } from "../transformers/EcommerceCustomerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerPasswordReset.IRequest;
}): Promise<IEcommerceCustomerPasswordReset.ISummary> {
  const currentTime = new Date().toISOString();
  const reset =
    await MyGlobal.prisma.ecommerce_customer_password_resets.findUnique({
      where: {
        token: (props.body as any).token,
        expires_at: { gt: currentTime },
        deleted_at: null,
      },
      ...EcommerceCustomerPasswordResetAtSummaryTransformer.select(),
    });
  if (!reset) throw new HttpException("Token not found or expired", 404);
  return await EcommerceCustomerPasswordResetAtSummaryTransformer.transform(
    reset,
  );
}
