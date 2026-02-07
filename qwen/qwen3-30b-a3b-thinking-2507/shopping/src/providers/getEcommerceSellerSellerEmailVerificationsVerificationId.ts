import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerEmailVerificationTransformer } from "../transformers/EcommerceSellerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerSellerEmailVerificationsVerificationId(props: {
  seller: SellerPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerEmailVerification> {
  const verification =
    await MyGlobal.prisma.ecommerce_seller_email_verifications.findUnique({
      where: {
        id: props.verificationId,
        deleted_at: null,
      },
      ...EcommerceSellerEmailVerificationTransformer.select(),
    });
  if (!verification) {
    throw new HttpException("Verification record not found", 404);
  }
  return await EcommerceSellerEmailVerificationTransformer.transform(
    verification,
  );
}
