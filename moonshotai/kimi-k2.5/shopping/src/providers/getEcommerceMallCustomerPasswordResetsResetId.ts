import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerPasswordResetTransformer } from "../transformers/EcommerceMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerPasswordResetsResetId(props: {
  customer: CustomerPayload;
  resetId: string;
}): Promise<IEcommerceMallCustomerPasswordReset> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...EcommerceMallCustomerPasswordResetTransformer.select(),
      },
    );
  if (record.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallCustomerPasswordResetTransformer.transform(record);
}
