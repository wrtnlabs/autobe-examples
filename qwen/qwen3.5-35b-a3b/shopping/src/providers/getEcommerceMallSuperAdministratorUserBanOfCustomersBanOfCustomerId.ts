import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanOfCustomerTransformer } from "../transformers/EcommerceMallUserBanOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdministratorUserBanOfCustomersBanOfCustomerId(props: {
  superAdministrator: SuperadministratorPayload;
  banOfCustomerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallUserBanOfCustomer> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findUniqueOrThrow(
      {
        ...EcommerceMallUserBanOfCustomerTransformer.select(),
        where: {
          id: props.banOfCustomerId,
          deleted_at: null,
        },
      },
    );
  return await EcommerceMallUserBanOfCustomerTransformer.transform(record);
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
// import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdministratorUserBanOfCustomersBanOfCustomerId(props: {
//   superAdministrator: SuperadministratorPayload;
//   banOfCustomerId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallUserBanOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findFirstOrThrow({
//     ...EcommerceMallUserBanOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallUserBanOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------