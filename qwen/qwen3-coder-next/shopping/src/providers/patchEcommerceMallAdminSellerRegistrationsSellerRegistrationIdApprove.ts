import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationTransformer } from "../transformers/EcommerceMallSellerRegistrationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellerRegistrationsSellerRegistrationIdApprove(props: {
  admin: AdminPayload;
  sellerRegistrationId: string;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  const { approval_status, rejection_reason } = props.body;
  if (
    approval_status === "rejected" &&
    (!rejection_reason || rejection_reason.trim().length === 0)
  ) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.sellerRegistrationId },
      },
    );
  if (registration.approval_status !== "pending") {
    throw new HttpException("Registration is not in pending state", 400);
  }
  const responded_at = new Date();
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
      where: { id: props.sellerRegistrationId },
      data: {
        approval_status,
        rejection_reason:
          approval_status === "rejected" ? rejection_reason : null,
        responded_at:
          approval_status === "approved" || approval_status === "rejected"
            ? responded_at
            : null,
      },
      ...EcommerceMallSellerRegistrationTransformer.select(),
    });
  return await EcommerceMallSellerRegistrationTransformer.transform(updated);
}
