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
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerPasswordReset> {
  const record =
    await MyGlobal.prisma.ecommerce_customer_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      ...EcommerceCustomerPasswordResetTransformer.select(),
    });
  return await EcommerceCustomerPasswordResetTransformer.transform(record);
}
