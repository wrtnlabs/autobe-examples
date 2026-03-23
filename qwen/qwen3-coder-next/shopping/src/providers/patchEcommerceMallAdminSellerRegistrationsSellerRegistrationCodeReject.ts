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

export async function patchEcommerceMallAdminSellerRegistrationsSellerRegistrationCodeReject(props: {
  admin: AdminPayload;
  sellerRegistrationCode: string;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.sellerRegistrationCode },
        ...EcommerceMallSellerRegistrationTransformer.select(),
      },
    );
  if (registration.approval_status !== "pending") {
    throw new HttpException(
      `Registration is already ${registration.approval_status}, cannot reject`,
      400,
    );
  }
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
      where: { id: props.sellerRegistrationCode },
      data: {
        approval_status: "rejected",
        rejection_reason: props.body.rejection_reason,
        responded_at: new Date(),
      },
      ...EcommerceMallSellerRegistrationTransformer.select(),
    });
  return await EcommerceMallSellerRegistrationTransformer.transform(updated);
}
