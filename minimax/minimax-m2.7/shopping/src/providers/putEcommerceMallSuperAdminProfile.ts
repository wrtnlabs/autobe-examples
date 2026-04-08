import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminProfile(props: {
  superAdmin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "super_admin";
  };
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  // Update super admin record with timestamp for audit purposes
  const updated = await MyGlobal.prisma.ecommerce_mall_super_admins.update({
    where: { id: props.superAdmin.id },
    data: {
      updated_at: new Date(),
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Return profile with null profileType since super admins don't have customer/seller profiles
  // Note: IEcommerceMallCustomerProfile.IUpdate has displayName/phone but ecommerce_mall_super_admins
  // schema only has email/password_hash fields, so body fields cannot be persisted
  const createdAtString = toISOStringSafe(updated.created_at);
  const updatedAtString = toISOStringSafe(updated.updated_at);
  return {
    id: updated.id,
    profileType: null,
    createdAt:
      createdAtString === null
        ? (new Date().toISOString() as string & tags.Format<"date-time">)
        : createdAtString,
    updatedAt:
      updatedAtString === null
        ? (new Date().toISOString() as string & tags.Format<"date-time">)
        : updatedAtString,
  };
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSuperAdminProfile(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallCustomerProfile.IUpdate;
// }): Promise<IEcommerceMallCustomerProfile> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------