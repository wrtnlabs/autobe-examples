import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function putEcommerceMallAdminRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: { id: true, seller_id: true, status: true },
      },
    );
  if (registration.status !== "pending") {
    throw new HttpException("Registration is not pending review", 400);
  }
  if (
    props.body.status === "rejected" &&
    (!props.body.rejectionReason || props.body.rejectionReason.length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  if (
    props.body.status === "approved" &&
    props.body.rejectionReason !== undefined &&
    props.body.rejectionReason !== null
  ) {
    throw new HttpException(
      "Rejection reason must be null when approving a registration",
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
    where: { id: props.registrationId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejectionReason : null,
      reviewer_id: props.admin.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: registration.seller_id },
      data: { approval_status: "approved", updated_at: new Date() },
    });
  }
  await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_registration_id: props.registrationId,
      ecommerce_mall_admin_id: props.admin.id,
      created_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        ...EcommerceMallSellerRegistrationTransformer.select(),
      },
    );
  return await EcommerceMallSellerRegistrationTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallAdminRegistrationsRegistrationId(props: {
//   admin: AdminPayload;
//   registrationId: string;
//   body: IEcommerceMallSellerRegistration.IUpdate;
// }): Promise<IEcommerceMallSellerRegistration> {
//   await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallSellerRegistrationTransformer.select(),
//   });
//   return await EcommerceMallSellerRegistrationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------