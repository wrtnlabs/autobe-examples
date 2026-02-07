import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerPasswordResetTransformer } from "../transformers/EcommerceSellerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerSellerPasswordResetsResetId(props: {
  seller: SellerPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerPasswordReset> {
  const token =
    await MyGlobal.prisma.ecommerce_seller_password_resets.findUnique({
      where: { id: props.resetId },
      ...EcommerceSellerPasswordResetTransformer.select(),
    });
  if (!token) {
    throw new HttpException("Token not found", 404);
  }
  const currentIso = new Date().toISOString();
  const expiresIso = token.expires_at.toISOString();
  if (expiresIso <= currentIso) {
    throw new HttpException("Token has expired", 404);
  }
  return await EcommerceSellerPasswordResetTransformer.transform(token);
}
