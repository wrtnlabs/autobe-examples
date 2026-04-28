import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformCustomerProfileTransformer } from "../transformers/EcommercePlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformAdminCustomersCustomerIdProfilesProfileId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformCustomerProfile> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirstOrThrow(
      {
        ...EcommercePlatformCustomerProfileTransformer.select(),
        where: {
          id: props.profileId,
          ecommerce_platform_customer_id: props.customerId,
          deleted_at: null,
        },
      },
    );
  return await EcommercePlatformCustomerProfileTransformer.transform(record);
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
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformAdminCustomersCustomerIdProfilesProfileId(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   profileId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformCustomerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirstOrThrow({
//     ...EcommercePlatformCustomerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformCustomerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------