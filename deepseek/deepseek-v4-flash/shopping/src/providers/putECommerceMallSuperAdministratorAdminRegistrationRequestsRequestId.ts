import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallAdminRegistrationRequestTransformer } from "../transformers/ECommerceMallAdminRegistrationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSuperAdministratorAdminRegistrationRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IECommerceMallAdminRegistrationRequest.IUpdate;
}): Promise<IECommerceMallAdminRegistrationRequest> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findUnique(
      {
        where: { id: props.requestId },
        select: { id: true, status: true },
      },
    );
  if (record === null) {
    throw new HttpException("Registration request not found", 404);
  }
  if (record.status !== "pending") {
    throw new HttpException("Registration request is already resolved", 422);
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejectionReason === undefined ||
      props.body.rejectionReason.trim().length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a request",
      422,
    );
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      reviewer_super_administrator_id: props.superAdministrator.id,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejectionReason! : null,
      reviewed_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ECommerceMallAdminRegistrationRequestTransformer.select(),
      },
    );
  return await ECommerceMallAdminRegistrationRequestTransformer.transform(
    updated,
  );
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
// import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSuperAdministratorAdminRegistrationRequestsRequestId(props: {
//   superAdministrator: SuperadministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IECommerceMallAdminRegistrationRequest.IUpdate;
// }): Promise<IECommerceMallAdminRegistrationRequest> {
//   await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallAdminRegistrationRequestTransformer.select(),
//   });
//   return await ECommerceMallAdminRegistrationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------