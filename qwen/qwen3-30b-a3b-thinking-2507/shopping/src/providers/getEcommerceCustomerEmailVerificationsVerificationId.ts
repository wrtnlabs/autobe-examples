import { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerEmailVerificationTransformer } from "../transformers/EcommerceCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerEmailVerificationsVerificationId(props: {
  customer: CustomerPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerEmailVerification> {
  const record =
    await MyGlobal.prisma.ecommerce_customer_email_verifications.findUnique({
      where: { id: props.verificationId, deleted_at: null },
      ...EcommerceCustomerEmailVerificationTransformer.select(),
    });
  if (!record) {
    throw new HttpException("Not found", 404);
  }
  return await EcommerceCustomerEmailVerificationTransformer.transform(record);
}
