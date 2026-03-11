import { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCustomerEmailVerificationTransformer } from "../transformers/EcommerceMallCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerEmailVerificationsVerificationId(props: {
  seller: SellerPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerEmailVerification> {
  const verification =
    await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId, deleted_at: null },
        ...EcommerceMallCustomerEmailVerificationTransformer.select(),
      },
    );
  return await EcommerceMallCustomerEmailVerificationTransformer.transform(
    verification,
  );
}
